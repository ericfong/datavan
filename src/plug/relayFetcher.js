// import _ from 'lodash'

import { addMutation, setAll } from '../collection/base'
import { load } from '../collection/load'
import { pickOptionForSerialize } from '../collection/util/calcQueryKey'
import { createStandalonePromise } from '../util/batcher'
import { findAsync } from '../collection/find'
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

    getHook(next, collection, id, option = {}) {
      const ret = next(collection, id, option)
      if (collection._byIdAts[id]) {
        option.allIdsHit = true
      }
      checkFetch(collection, [id], option, doFetch)
      return ret
    },

    findHook(next, collection, query = {}, option = {}) {
      const ret = next(collection, query, option)
      // checkFetch depend on queryHit & allIdsHit, so need to run AFTER base.find
      checkFetch(collection, query, option, doFetch)
      return ret
    },

    findAsyncHook(next, collection, query = {}, option = {}) {
      return doFetch(collection, query, option, doFetch).then(() => next(collection, query, option))
    },

    setAllHook(next, collection, change, option) {
      next(collection, change, option)
      const request = makeRequest(collection, 'setAll', change)
      Promise.resolve(postMessage(request, {}, collection))
        .then(res => waitForReport(res, request._id))
        .then(res => load(collection, res))
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

const workFuncs = {
  findAsync,
  setAll,
}

export function relayWorker(onFetch, onSubmit) {
  return base => ({
    ...base,
    onFetch,

    setAllHook(next, collection, change, option) {
      next(collection, change, option)
      submit(collection, onSubmit)
    },

    executeRelay(request) {
      // relay.action = 'findAsync' | 'setAll'
      // console.log('>>>', request.action, workFuncs[request.action], ...request.args)
      return Promise.resolve(workFuncs[request.action](this, ...request.args)).then(ret => {
        // console.log('handleRelay', relay.action, relay.name, relay.args[0], ret)
        request.result = ret
        return request
      })
    },
  })
}
