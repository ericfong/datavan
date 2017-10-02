// import _ from 'lodash'

import { addMutation } from '../collection/base'
import { load } from '../collection/load'
import { pickOptionForSerialize } from '../collection/util/calcQueryKey'
import { createStandalonePromise } from '../util/batcher'
import { submit } from '../collection/submitter'

export const isPreloadSkip = (self, option) => !option.serverPreload && self.store && self.store.vanCtx.duringServerPreload

// @auto-fold here
export function wrapFetchPromise(self, query, option, optionField, doFetch) {
  const { _fetchingPromises } = self
  const key = option[optionField]
  const oldPromise = _fetchingPromises[key]
  if (oldPromise) return oldPromise

  const promise = doFetch(self, query, option)
    .then(ret => {
      if (_fetchingPromises[key] === promise) {
        delete _fetchingPromises[key]
        addMutation(self, null) // force render to update isFetching
      }
      return ret
    })
    .catch(err => {
      if (_fetchingPromises[key] === promise) {
        delete _fetchingPromises[key]
        addMutation(self, null) // force render to update isFetching
      }
      return Promise.reject(err)
    })
  _fetchingPromises[key] = promise
  return promise
}

function checkFetch(self, query, option, doFetch) {
  if (isPreloadSkip(self, option) || option.queryHit || option.allIdsHit) return false

  return wrapFetchPromise(self, query, option, 'queryKey', doFetch)
}

let requestNum = 0
const makeRequest = (self, action, ...args) => ({ _id: requestNum++, tag: `${self.name}/${action}`, name: self.name, action, args })
const makeFindRequest = (self, query, option) => makeRequest(self, 'findAsync', query, pickOptionForSerialize(option))

export default function relayFetcher(postMessage) {
  const promises = {}

  function waitForReport(res, promiseId) {
    if (!res) {
      // if no res, means need to wait and resolve via handleResponse
      const p = createStandalonePromise()
      promises[promiseId] = p
      return p
    }
    return res
  }

  function doFetch(self, query, option) {
    const request = makeFindRequest(self, query, option)
    return Promise.resolve(postMessage(request, option, self))
      .then(res => waitForReport(res, request._id))
      .then(res => load(self, res, option))
  }

  const relayPlugin = base => ({
    ...base,

    get(id, option = {}) {
      const ret = base.get.call(this, id, option)
      if (this._byIdAts[id]) {
        option.allIdsHit = true
      }
      checkFetch(this, [id], option, doFetch)
      return ret
    },

    find(query = {}, option = {}) {
      const ret = base.find.call(this, query, option)
      // checkFetch depend on queryHit & allIdsHit, so need to run AFTER base.find
      checkFetch(this, query, option, doFetch)
      return ret
    },

    findAsync(query = {}, option = {}) {
      return doFetch(this, query, option, doFetch).then(() => base.find.call(this, query, option))
    },

    setAll(change, option) {
      base.setAll.call(this, change, option)

      const request = makeRequest(this, 'setAll', change)
      Promise.resolve(postMessage(request, {}, this))
        .then(res => waitForReport(res, request._id))
        .then(res => load(this, res))
    },
  })

  relayPlugin.handleRelayPush = request => {
    if (request) {
      const promise = promises[request._id]
      if (promise) promise.resolve(request.result)
    }
  }

  return relayPlugin
}

export function relayWorker(onFetch, onSubmit) {
  return base => ({
    ...base,
    onFetch,
    setAll(change, option) {
      base.setAll.call(this, change, option)
      return submit(this, onSubmit)
    },

    executeRelay(request) {
      // relay.action = 'findAsync' | 'setAll'
      return Promise.resolve(this[request.action](...request.args)).then(ret => {
        // console.log('handleRelay', relay.action, relay.name, relay.args[0], ret)
        request.result = ret
        return request
      })
    },
  })
}
