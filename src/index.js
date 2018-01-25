import { getCollection, dispatchMutations, getStore } from './store'
import { _getAll, _genTmpId } from './collection'
import { reset as _reset, _invalidate, _garbageCollect } from './collection/reset'
import { load as _load } from './collection/load'
import { findInMemory as _findInMemory } from './collection/findInMemory'
import { _get, _getInMemory, _find, _findAsync, _getAsync, _findOne, _getPending, _run } from './collection/getter'
import {
  _setAll,
  mutate as _mutate,
  set as _set,
  del as _del,
  insert as _insert,
  update as _update,
  remove as _remove,
} from './collection/setter'
import {
  getOriginals as _getOriginals,
  getSubmits as _getSubmits,
  submit as _submit,
  getSubmittedIds as _getSubmittedIds,
} from './collection/submitter'
import { _calcOnChange, _getIndex } from './collection/calcOnChange'
import {
  invalidateStore as _invalidateStore,
  getStorePending as _getStorePending,
  serverPreload as _serverPreload,
  setContext as _setContext,
  getContext as _getContext,
  gcStore as _gcStore,
  resetStore as _resetStore,
  loadCollections as _loadCollections,
} from './extra/store-extra'

const WRITE = 'WRITE'
const ASYNC_WRITE = 'ASYNC_WRITE'
function wrapCollect(args, func, mode) {
  const coll = args[0]
  // it is collection if have cast function
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
  const store = _store && _store.dispatch ? _store : getStore(_store)
  const ret = func(store, ...rest)
  if (mode === WRITE) {
    dispatchMutations(store)
  } else if (mode === ASYNC_WRITE && ret && ret.then) {
    ret.then(() => dispatchMutations(store))
  }
  return ret
}

// collection
export const getAll = (...args) => wrapCollect(args, _getAll)
export const getOriginals = (...args) => wrapCollect(args, _getOriginals)
export const getSubmits = (...args) => wrapCollect(args, _getSubmits)
export const get = (...args) => wrapCollect(args, _get)
export const find = (...args) => wrapCollect(args, _find)
export const findAsync = (...args) => wrapCollect(args, _findAsync)
export const findOne = (...args) => wrapCollect(args, _findOne)
export const findInMemory = (...args) => wrapCollect(args, _findInMemory)
export const getIndex = (...args) => wrapCollect(args, _getIndex)
export const calcOnChange = (...args) => wrapCollect(args, _calcOnChange)
// Deprecated
export const getAsync = (...args) => wrapCollect(args, _getAsync)
export const getInMemory = (...args) => wrapCollect(args, _getInMemory)

export const load = (...args) => wrapCollect(args, _load, WRITE)
export const mutate = (...args) => wrapCollect(args, _mutate, WRITE)
export const setAll = (...args) => wrapCollect(args, _setAll, WRITE)
export const invalidate = (...args) => wrapCollect(args, _invalidate, WRITE)
export const reset = (...args) => wrapCollect(args, _reset, WRITE)
export const garbageCollect = (...args) => wrapCollect(args, _garbageCollect, WRITE)
export const set = (...args) => wrapCollect(args, _set, WRITE)
export const del = (...args) => wrapCollect(args, _del, WRITE)
export const insert = (...args) => wrapCollect(args, _insert, WRITE)
export const update = (...args) => wrapCollect(args, _update, WRITE)
export const remove = (...args) => wrapCollect(args, _remove, WRITE)

export const submit = (...args) => wrapCollect(args, _submit, ASYNC_WRITE)
export const getSubmittedIds = (...args) => wrapCollect(args, _getSubmittedIds)
export const getPending = (...args) => wrapCollect(args, _getPending, ASYNC_WRITE)
export const run = (...args) => wrapCollect(args, _run)

// store
export const genTmpId = (...args) => wrapStore(args, _genTmpId)
export const resetStore = (...args) => wrapStore(args, _resetStore, WRITE)
export const invalidateStore = (...args) => wrapStore(args, _invalidateStore, WRITE)
export const gcStore = (...args) => wrapStore(args, _gcStore, WRITE)
export const loadCollections = (...args) => wrapStore(args, _loadCollections, WRITE)
export const getStorePending = (...args) => wrapStore(args, _getStorePending, ASYNC_WRITE)
export const serverPreload = (...args) => wrapStore(args, _serverPreload)
export const setContext = (...args) => wrapStore(args, _setContext)
export const getContext = (...args) => wrapStore(args, _getContext)

// plain export
export { getCollection, dispatchMutations, getStore }
export datavanEnhancer, { datavanReducer, createVanReducer } from './datavanEnhancer'
export { TMP_ID_PREFIX, INVALIDATE_ALL, INVALIDATE_EXPIRED } from './constant'
export { queryTester } from './collection/findInMemory'
export { genId, tmpIdRegExp } from './collection'
export { defaultGetQueryString } from './collection/fetcher'

export plugBrowser, { getBrowserWidth, getBrowserHeight } from './extra/browser'
export connectOnChange from './extra/connectOnChange'
export withMethods from './extra/withMethods'
export { compose } from 'redux'
export searchObjects, { tokenizeKeywords } from './extra/searchObjects'
