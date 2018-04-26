import { getCollection, dispatchMutations, getStore } from './store'
import {
  genTmpId as _genTmpId,
  getAll as _getAll,
  getOriginals as _getOriginals,
  getSubmits as _getSubmits,
  getPending as _getPending,
} from './collection'
import {
  pickInMemory as _pickInMemory,
  findInMemory as _findInMemory,
  get as _get,
  find as _find,
  findAsync as _findAsync,
  pick as _pick,
  pickAsync as _pickAsync,
} from './collection/find'
import { load as _load } from './collection/load'
import { reset as _reset } from './collection/reset'
import { mutate as _mutate, set as _set, insert as _insert, update as _update, remove as _remove } from './collection/setter'
import { checkFetch as _checkFetch } from './collection/fetcher'
import { recall as _recall } from './collection/recall'
import {
  getStorePending as _getStorePending,
  serverPreload as _serverPreload,
  resetStore as _resetStore,
  loadCollections as _loadCollections,
} from './extra/store-extra'

const WRITE = 'WRITE'
const ASYNC_WRITE = 'ASYNC_WRITE'
function wrapCollect(args, func, mode) {
  const coll = args[0]
  const newArgs = coll && coll.idField ? args : [getCollection(coll, args[1]), ...args.slice(2)]
  const ret = func(...newArgs)
  if (mode === WRITE) {
    dispatchMutations(newArgs[0].store)
  } else if (mode === ASYNC_WRITE && ret && ret.then) {
    ret.then(() => dispatchMutations(newArgs[0].store))
  }
  return ret
}
function wrapStore(args, func, mode) {
  const [_store, ...rest] = args
  const store = _store && (_store.dispatch ? _store : getStore(_store))
  const ret = func(store, ...rest)
  if (mode === WRITE) {
    dispatchMutations(store)
  } else if (mode === ASYNC_WRITE && ret && ret.then) {
    ret.then(() => dispatchMutations(store))
  }
  return ret
}

// collection
export const find = (...args) => wrapCollect(args, _find)
export const findAsync = (...args) => wrapCollect(args, _findAsync)
export const findInMemory = (...args) => wrapCollect(args, _findInMemory)
export const pick = (...args) => wrapCollect(args, _pick)
export const pickAsync = (...args) => wrapCollect(args, _pickAsync)
export const pickInMemory = (...args) => wrapCollect(args, _pickInMemory)

export const get = (...args) => wrapCollect(args, _get)
export const checkFetch = (...args) => wrapCollect(args, _checkFetch)

export const getAll = (...args) => wrapCollect(args, _getAll)
export const getOriginals = (...args) => wrapCollect(args, _getOriginals)
export const getSubmits = (...args) => wrapCollect(args, _getSubmits)
export const recall = (...args) => wrapCollect(args, _recall)

export const insert = (...args) => wrapCollect(args, _insert, WRITE)
export const update = (...args) => wrapCollect(args, _update, WRITE)
export const remove = (...args) => wrapCollect(args, _remove, WRITE)
export const mutate = (...args) => wrapCollect(args, _mutate, WRITE)
export const set = (...args) => wrapCollect(args, _set, WRITE)

export const reset = (...args) => wrapCollect(args, _reset, WRITE)
export const load = (...args) => wrapCollect(args, _load, WRITE)

// Extra
export const genTmpId = (...args) => wrapStore(args, _genTmpId)
export const getPending = (...args) => wrapCollect(args, _getPending)

export const resetStore = (...args) => wrapStore(args, _resetStore, WRITE)
export const loadCollections = (...args) => wrapStore(args, _loadCollections, WRITE)
export const getStorePending = (...args) => wrapStore(args, _getStorePending)
export const serverPreload = (...args) => wrapStore(args, _serverPreload)

// plain export
export { getCollection, dispatchMutations, getStore }
export * from './definition'
export datavanEnhancer, { createVanReducer } from './datavanEnhancer'
export { mingoQuery, mingoTester, pickBy, queryData } from './collection/find'
export { defaultGetQueryString } from './collection/fetcher'
export { buildIndex } from './collection/recall'

export { getBrowserWidth, getBrowserHeight } from './extra/browser'
export connectOnChange from './extra/connectOnChange'
export withMethods from './extra/withMethods'
export { compose } from 'redux'
export searchObjects, { tokenizeKeywords } from './extra/searchObjects'

export { createDb, createDatavanContext, getMemoizeHoc, forkDb } from './mutext'
