import { getState as _getState, addMutation as _addMutation, getAll as _getAll, get as _get, _mutateAll, setAll as _setAll } from './collection/base'
import { load as _load } from './collection/load'
import { invalidate as _invalidate, reset as _reset, garbageCollect as _garbageCollect } from './collection/invalidate'
import { mutate as _mutate, set as _set, del as _del, insert as _insert, update as _update, remove as _remove } from './collection/setter'
import { getOriginals as _getOriginals, getSubmits as _getSubmits, submit as _submit, getSubmittedIds as _getSubmittedIds } from './collection/submitter'
import { _findInMemory, _getInMemory, _find, _findAsync, _getAsync, _findOne, _getPending, _run } from './collection/find'
import { getCollection, dispatchMutations, getStore } from './store-base'

import {
  invalidateStore as _invalidateStore,
  getStorePending as _getStorePending,
  serverPreload as _serverPreload,
  setContext as _setContext,
  getContext as _getContext,
  gcStore as _gcStore,
} from './store'
import _loadCollections from './store/loadCollections'

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

export { getCollection, dispatchMutations }
export { EXPIRED, ALL } from './collection/invalidate'

// collection
export const getState = (...args) => wrapCollect(args, _getState)
export const addMutation = (...args) => wrapCollect(args, _addMutation, WRITE)
export const getAll = (...args) => wrapCollect(args, _getAll)
export const get = (...args) => wrapCollect(args, _get)
export const mutateAll = (...args) => wrapCollect(args, _mutateAll, WRITE)
export const setAll = (...args) => wrapCollect(args, _setAll, WRITE)

export const load = (...args) => wrapCollect(args, _load, WRITE)

export const invalidate = (...args) => wrapCollect(args, _invalidate, WRITE)
export const reset = (...args) => wrapCollect(args, _reset, WRITE)
export const garbageCollect = (...args) => wrapCollect(args, _garbageCollect, WRITE)

export const set = (...args) => wrapCollect(args, _set, WRITE)
export const mutate = (...args) => wrapCollect(args, _mutate, WRITE)
export const del = (...args) => wrapCollect(args, _del, WRITE)
export const insert = (...args) => wrapCollect(args, _insert, WRITE)
export const update = (...args) => wrapCollect(args, _update, WRITE)
export const remove = (...args) => wrapCollect(args, _remove, WRITE)

export const getOriginals = (...args) => wrapCollect(args, _getOriginals)
export const getSubmits = (...args) => wrapCollect(args, _getSubmits)
export const submit = (...args) => wrapCollect(args, _submit, ASYNC_WRITE)
export const getSubmittedIds = (...args) => wrapCollect(args, _getSubmittedIds)

export const find = (...args) => wrapCollect(args, _find)
export const findAsync = (...args) => wrapCollect(args, _findAsync)

export const getAsync = (...args) => wrapCollect(args, _getAsync)
export const findOne = (...args) => wrapCollect(args, _findOne)
export const getPending = (...args) => wrapCollect(args, _getPending, ASYNC_WRITE)
export const run = (...args) => wrapCollect(args, _run)

export const findInMemory = (...args) => wrapCollect(args, _findInMemory)
export const getInMemory = (...args) => wrapCollect(args, _getInMemory)

// redux
export datavanEnhancer, { datavanReducer } from './datavanEnhancer'

// store
export const invalidateStore = (...args) => wrapStore(args, _invalidateStore, WRITE)
export const gcStore = (...args) => wrapStore(args, _gcStore, WRITE)
export const loadCollections = (...args) => wrapStore(args, _loadCollections, WRITE)
export const getStorePending = (...args) => wrapStore(args, _getStorePending, ASYNC_WRITE)
export const serverPreload = (...args) => wrapStore(args, _serverPreload)
export const setContext = (...args) => wrapStore(args, _setContext)
export const getContext = (...args) => wrapStore(args, _getContext)

// extension
export plugBrowser, { getBrowserWidth, getBrowserHeight } from './extension/browser'
export reduxDebounceSubscriber from './extension/reduxDebounceSubscriber'
export connectOnChange from './extension/connectOnChange'
export withMethods from './extension/withMethods'
export { compose } from 'recompose'
