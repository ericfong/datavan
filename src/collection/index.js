import { TMP_ID_PREFIX } from '../constant'
import { init } from './load'
import httpFetcher from './fetcher'

const collectionPrototype = {
  // __proxy__
  idField: '_id',
  // gcTime: 60 * 1000,
  // onInit, onLoad
  // findHook, filterHook, postFindHook, findAsyncHook, getHook, getAllHook, setAllHook
  cast: v => v,
  genId: () => `${TMP_ID_PREFIX}${Date.now()}${Math.random()}`,
}

export default function createCollection(spec) {
  let self = Object.assign({}, collectionPrototype, spec)

  if (self.onFetch) self = httpFetcher(self)

  init(self)

  return self
}
