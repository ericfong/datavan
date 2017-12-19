import { TMP_ID_PREFIX } from './util/idUtil'
import { init } from './load'
import httpFetcher from './fetcher'

const functions = {
  // __proxy__
  idField: '_id',
  // gcTime: 60 * 1000,
  // onInit, onLoad
  // findHook, filterHook, getHook, getAllHook, setAllHook
  cast: v => v,
  genId: () => `${TMP_ID_PREFIX}${Date.now()}${Math.random()}`,
}

export default function createCollection(spec) {
  let self = Object.assign({}, functions, spec)

  if (self.onFetch) self = httpFetcher(self)

  init(self)

  return self
}
