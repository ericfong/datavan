import _ from 'lodash'
import { load } from '../collection/load'
import { pickOptionForSerialize } from '../collection/util/calcQueryKey'
import { createStandalonePromise } from '../util/batcher'
import { isPreloadSkip, markPromise } from '../plug/httpFetcher'
import { _getCollection } from '../defineCollection'
import runHook from '../collection/util/runHook'

let requestNum = 0
const makeStoreRequest = type => ({ _id: `relay-${requestNum++}`, type })
const makeRequest = (collection, type, ...args) => ({
  ...makeStoreRequest(type),
  collectionName: collection.name,
  tag: `${collection.name}-${type}`,
  args,
})
const makeFindRequest = (collection, type, query, option) => makeRequest(collection, type, query, pickOptionForSerialize(option))

function createPromiseInTable(promiseTable, id, props) {
  const p = createStandalonePromise()
  _.defaults(p, props)

  // mark promise
  p
    .then(ret => {
      if (promiseTable[id] === p) delete promiseTable[id]
      return ret
    })
    .catch(err => {
      if (promiseTable[id] === p) delete promiseTable[id]
      return Promise.reject(err)
    })
  promiseTable[id] = p

  return p
}

export default function relayClient({ onMessage }) {
  const promises = {}

  const postToWorker = (request, option, self) => {
    // always mark local promise and return
    const p = createPromiseInTable(promises, request._id, request)

    Promise.resolve(onMessage(request, option, self)).then(result => {
      // if has result, means can resolve now, no need wait for onWorkerMessage
      if (result) return p.resolve(result)
    })

    return p
  }

  function doFetch(self, request, option) {
    const p = postToWorker(request, option, self).then(res => {
      const result = request.type === 'get' ? [res.result] : res.result
      if (self.mutatedAt >= res.workerMutatedAt) {
        // ignore result, and no load, no mutation
        return result
      }
      return load(self, result, option)
    })
    markPromise(self, request._id, p)
    return p
  }

  const isFetch = (self, option) => !(isPreloadSkip(self, option) || option.queryHit || option.allIdsHit)

  const relayPlugin = base => ({
    ...base,

    getHook(next, collection, id, option = {}) {
      const ret = runHook(base.getHook, next, collection, id, option)
      // if fetch once. always consider as allIdsHit and no re-fetch from relayWorker
      if (collection._byIdAts[id]) {
        option.allIdsHit = true
      }
      if (isFetch(collection, option)) doFetch(collection, makeFindRequest(collection, 'get', id, option), option)
      return ret
    },

    findHook(next, collection, query = {}, option = {}) {
      const ret = runHook(base.findHook, next, collection, query, option)
      // depend on queryHit & allIdsHit, so need to run AFTER base.find
      if (isFetch(collection, option)) doFetch(collection, makeFindRequest(collection, 'find', query, option), option)
      return ret
    },

    findAsyncHook(next, collection, query = {}, option = {}) {
      return doFetch(collection, makeFindRequest(collection, 'findAsync', query, option), option).then(() =>
        runHook(base.findAsyncHook, next, collection, query, option))
    },

    setAllHook(next, collection, change, option) {
      runHook(base.setAllHook, next, collection, change, option)
      const request = makeRequest(collection, 'setAll', change)
      const p = postToWorker(request, {}, collection)
      // NOTE worker: submit -> load -> onLoad -> onMessage; no need to load request.result in here
      //   .then(res => load(collection, res.result))

      // need to register promise to collection._fetchingPromises, so that can wait for submit
      return markPromise(collection, request._id, p)
    },
  })

  relayPlugin.onWorkerMessage = (store, message) => {
    if (!message) return

    // message is a request response
    const promise = promises[message._id]
    if (promise) {
      promise.resolve(message)
    }

    if (message.type === 'ready') {
      _.each(promises, p => {
        if (p.type === 'ready') p.resolve(message)
      })
    }

    // message is like a redux dispatch
    if (message.type === 'load') {
      const collection = _getCollection(store, message.collectionName)
      if (!collection) throw new Error('Cannot get collection in onWorkerMessage function', message)
      load(collection, message.data)
    }
  }

  relayPlugin.ready = () => {
    const firstPromise = postToWorker(makeStoreRequest('ready'))

    let polling = setInterval(() => {
      if (polling) postToWorker(makeStoreRequest('ready'))
    }, 5000)

    return firstPromise.then(() => {
      clearInterval(polling)
      polling = false
    })
  }

  return relayPlugin
}
