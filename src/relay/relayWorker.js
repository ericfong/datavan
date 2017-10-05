// import _ from 'lodash'
import { setAll, get } from '../collection/base'
import { find, findAsync } from '../collection/find'
import { submit } from '../collection/submitter'
import { getCollection } from '../defineCollection'

const workFuncs = {
  get,
  find,
  findAsync,
  setAll,
}

export default function relayWorker({ onFetch, onSubmit, postMessage }) {
  const workerPlugin = base => ({
    ...base,
    onFetch,

    setAllHook(next, collection, change, option) {
      next(collection, change, option)
      submit(collection, onSubmit)
    },

    onLoad(collection, payload) {
      // console.log(collection.store.vanCtx.side, 'onLoad', payload)
      postMessage({ type: 'load', collectionName: collection.name, payload })
    },
  })

  workerPlugin.onClientMessage = (store, request) => {
    const collection = getCollection(store, request.collectionName)
    return Promise.resolve(workFuncs[request.action](collection, ...request.args)).then(ret => {
      request.result = ret
      request.workerMutatedAt = collection.mutatedAt
      // console.log(collection.store.vanCtx.side, 'onClientMessage', request)
      postMessage(request)
    })
  }

  return workerPlugin
}
