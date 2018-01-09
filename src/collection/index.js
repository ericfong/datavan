import { TMP_ID_PREFIX } from '../constant'
import { init } from './load'
import fetcher from './fetcher'

const collectionPrototype = {
  idField: '_id',
  // gcTime: 60 * 1000,
  // onInit, onLoad
  // getHook, findHook, findAsyncHook, filterHook, postFindHook
  cast: v => v,
  genId: () => `${TMP_ID_PREFIX}${Date.now()}${Math.random()}`,

  getState() {
    return this.store.getState().datavan[this.name]
  },

  addMutation(mutation) {
    this.mutatedAt = Date.now()
    this.store.vanCtx.mutates.push({ collection: this.name, mutation })
  },

  getAll() {
    return this.getState().byId
  },
}

export default function createCollection(spec) {
  let collection = Object.assign({}, collectionPrototype, spec)

  if (spec.onFetch) collection = fetcher(collection)

  init(collection)

  return collection
}
