// import _ from 'lodash'
import { setAll, get } from '../collection/base'
import { find, findAsync } from '../collection/find'
import { submit } from '../collection/submitter'
import { _getCollection } from '../defineCollection'
import runHook from '../collection/util/runHook'

const workFuncs = {
  get,
  find,
  findAsync,
  setAll,
  ready: () => true,
}

export default function relayWorker({ onFetch, onSubmit, onMessage }) {
  const workerPlugin = base => ({
    ...base,
    onFetch,

    setAllHook(next, collection, change, option) {
      runHook(base.setAllHook, next, collection, change, option)
      // NOTE submit -> load -> onLoad -> onMessage; no need to set request.result
      // but relayClient may want to know this submit have been DONE
      return submit(collection, onSubmit)
    },

    onLoad(collection, data, mutation) {
      onMessage({ type: 'load', collectionName: collection.name, data })
      return base.onLoad && base.onLoad(collection, data, mutation)
    },
  })

  workerPlugin.onClientMessage = (store, request) => {
    const { collectionName, args } = request
    const self = collectionName ? _getCollection(store, collectionName) : store
    return Promise.resolve(workFuncs[request.type](self, ...(args || []))).then(ret => {
      request.result = ret
      request.workerMutatedAt = collectionName && self.mutatedAt
      // console.log(collection.store.vanCtx.side, 'onClientMessage', request)
      onMessage(request)
    })
  }

  return workerPlugin
}
