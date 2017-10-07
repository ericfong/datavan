// import _ from 'lodash'
import { load } from '../collection/load'
import { pickOptionForSerialize } from '../collection/util/calcQueryKey'
import { createStandalonePromise } from '../util/batcher'
import { isPreloadSkip, wrapFetchPromise } from '../plug/httpFetcher'
import { getCollection } from '../defineCollection'
import runHook from '../collection/util/runHook'

let requestNum = 0
const makeRequest = (collection, action, ...args) => ({
  _id: requestNum++,
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

    return wrapFetchPromise(self, option.queryKey, doFetch(self, request, option))
  }

  const relayPlugin = base => ({
    ...base,

    getHook(next, collection, id, option = {}) {
      const ret = runHook(base.getHook, next, collection, id, option)
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
        runHook(base.findAsyncHook, next, collection, query, option)
      )
    },

    setAllHook(next, collection, change, option) {
      runHook(base.setAllHook, next, collection, change, option)
      const request = makeRequest(collection, 'setAll', change)
      Promise.resolve(onMessage(request, {}, collection))
        .then(res => ensureWaitFor(res, request._id))
        .then(res => load(collection, res.result))
    },
  })

  relayPlugin.onWorkerMessage = (store, message) => {
    if (!message) return

    // message is a request response
    const promise = promises[message._id]
    if (promise) promise.resolve(message)

    // message is like a redux dispatch
    if (message.type === 'load') {
      const collection = getCollection(store, message.collectionName)
      load(collection, message.payload)
    }
  }

  return relayPlugin
}
