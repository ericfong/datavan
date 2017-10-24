// import _ from 'lodash'
import { load } from '../collection/load'
import { pickOptionForSerialize } from '../collection/util/calcQueryKey'
import { createStandalonePromise } from '../util/batcher'
import { isPreloadSkip, wrapFetchPromise } from '../plug/httpFetcher'
import { _getCollection } from '../defineCollection'
import runHook from '../collection/util/runHook'

let requestNum = 0
const makeRequest = (collection, action, ...args) => ({
  _id: `relay-${requestNum++}`,
  collectionName: collection.name,
  tag: `${collection.name}-${action}`,
  action,
  args,
})
const makeFindRequest = (collection, action, query, option) => makeRequest(collection, action, query, pickOptionForSerialize(option))

export default function relayClient({ onMessage }) {
  const promises = {}

  function ensureWaitFor(res, promiseId) {
    if (res) return res
    // if no res, means need to wait and resolve via handleResponse
    const p = createStandalonePromise()
    promises[promiseId] = p
    return p
  }

  function doFetch(self, request, option) {
    return Promise.resolve(onMessage(request, option, self))
      .then(res => ensureWaitFor(res, request._id))
      .then(res => {
        if (self.mutatedAt >= res.workerMutatedAt) {
          // ignore result, and no load, no mutation
          return res.result
        }
        // console.log(self.store.vanCtx.side, 'doFetch', res)
        return load(self, res.result, option)
      })
  }

  function checkFetch(self, request, option) {
    if (isPreloadSkip(self, option) || option.queryHit || option.allIdsHit) return false

    return wrapFetchPromise(self, request._id, doFetch(self, request, option))
  }

  const relayPlugin = base => ({
    ...base,

    getHook(next, collection, id, option = {}) {
      const ret = runHook(base.getHook, next, collection, id, option)
      // if fetch once. always consider as allIdsHit and no re-fetch from relayWorker
      if (collection._byIdAts[id]) {
        option.allIdsHit = true
      }
      checkFetch(collection, makeFindRequest(collection, 'get', id, option), option)
      return ret
    },

    findHook(next, collection, query = {}, option = {}) {
      const ret = runHook(base.findHook, next, collection, query, option)
      // checkFetch depend on queryHit & allIdsHit, so need to run AFTER base.find
      checkFetch(collection, makeFindRequest(collection, 'find', query, option), option)
      return ret
    },

    findAsyncHook(next, collection, query = {}, option = {}) {
      return doFetch(collection, makeFindRequest(collection, 'findAsync', query, option), option).then(() =>
        runHook(base.findAsyncHook, next, collection, query, option))
    },

    setAllHook(next, collection, change, option) {
      runHook(base.setAllHook, next, collection, change, option)
      const request = makeRequest(collection, 'setAll', change)
      const p = Promise.resolve(onMessage(request, {}, collection)).then(res => ensureWaitFor(res, request._id))
      // NOTE worker: submit -> load -> onLoad -> onMessage; no need to load request.result in here
      //   .then(res => load(collection, res.result))

      // need to register promise to collection._fetchingPromises
      return wrapFetchPromise(collection, request._id, p)
    },
  })

  relayPlugin.onWorkerMessage = (store, message) => {
    if (!message) return

    // message is a request response
    const promise = promises[message._id]
    if (promise) {
      promise.resolve(message)
    }

    // message is like a redux dispatch
    if (message.type === 'load') {
      const collection = _getCollection(store, message.collectionName)
      if (!collection) throw new Error('Cannot get collection in onWorkerMessage function', message)
      load(collection, message.data)
    }
  }

  return relayPlugin
}
