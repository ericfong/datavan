import { getState as _getState, addMutation as _addMutation, getAll as _getAll, get as _get, setAll as _setAll } from './collection/base'
import { load as _load } from './collection/load'
import { invalidate as _invalidate, reset as _reset, garbageCollect as _garbageCollect } from './collection/invalidate'
import { set as _set, del as _del, insert as _insert, update as _update, remove as _remove } from './collection/setter'
import { getOriginals as _getOriginals, getSubmits as _getSubmits, submit as _submit, getSubmittedIds as _getSubmittedIds } from './collection/submitter'
import { find as _find, findAsync as _findAsync } from './collection/find'
import { getAsync as _getAsync, findOne as _findOne, allPendings as _allPendings } from './collection/find-extra'
import _findInMemory, { getInMemory as _getInMemory } from './collection/findInMemory'

import {
  setOverrides as _setOverrides,
  invalidateStore as _invalidateStore,
  getStorePending as _getStorePending,
  serverPreload as _serverPreload,
  setContext as _setContext,
  getContext as _getContext,
  gcStore as _gcStore,
} from './store'
import _loadCollections from './store/loadCollections'

import { wrapCollectionArgs, wrapStoreArgs } from './getArgs'

// collection
export const getState = (...args) => wrapCollectionArgs(args, _getState)
export const addMutation = (...args) => wrapCollectionArgs(args, _addMutation)
export const getAll = (...args) => wrapCollectionArgs(args, _getAll)
export const get = (...args) => wrapCollectionArgs(args, _get)
export const setAll = (...args) => wrapCollectionArgs(args, _setAll)

export const load = (...args) => wrapCollectionArgs(args, _load)

export const invalidate = (...args) => wrapCollectionArgs(args, _invalidate)
export const reset = (...args) => wrapCollectionArgs(args, _reset)
export const garbageCollect = (...args) => wrapCollectionArgs(args, _garbageCollect)

export const set = (...args) => wrapCollectionArgs(args, _set)
export const del = (...args) => wrapCollectionArgs(args, _del)
export const insert = (...args) => wrapCollectionArgs(args, _insert)
export const update = (...args) => wrapCollectionArgs(args, _update)
export const remove = (...args) => wrapCollectionArgs(args, _remove)

export const getOriginals = (...args) => wrapCollectionArgs(args, _getOriginals)
export const getSubmits = (...args) => wrapCollectionArgs(args, _getSubmits)
export const submit = (...args) => wrapCollectionArgs(args, _submit)
export const getSubmittedIds = (...args) => wrapCollectionArgs(args, _getSubmittedIds)

export const find = (...args) => wrapCollectionArgs(args, _find)
export const findAsync = (...args) => wrapCollectionArgs(args, _findAsync)

export const getAsync = (...args) => wrapCollectionArgs(args, _getAsync)
export const findOne = (...args) => wrapCollectionArgs(args, _findOne)
export const allPendings = (...args) => wrapCollectionArgs(args, _allPendings)

export const findInMemory = (...args) => wrapCollectionArgs(args, _findInMemory)
export const getInMemory = (...args) => wrapCollectionArgs(args, _getInMemory)

// redux
export { defineCollection } from './defineCollection'
export datavanEnhancer, { datavanReducer } from './datavanEnhancer'
export memorizeConnect from './util/memorizeConnect'

const deprecated = (funcName, ret) => {
  if (process.env.NODE_ENV !== 'production') console.error(`${funcName} is deprecated!`)
  return ret
}

export { getCollection } from './getArgs'

// store
export const setOverrides = (...args) => deprecated('setOverrides', wrapStoreArgs(args, _setOverrides))
export const invalidateStore = (...args) => wrapStoreArgs(args, _invalidateStore)
export const getStorePending = (...args) => wrapStoreArgs(args, _getStorePending)
export const serverPreload = (...args) => wrapStoreArgs(args, _serverPreload)
export const setContext = (...args) => wrapStoreArgs(args, _setContext)
export const getContext = (...args) => wrapStoreArgs(args, _getContext)
export const gcStore = (...args) => wrapStoreArgs(args, _gcStore)
export const loadCollections = (...args) => wrapStoreArgs(args, _loadCollections)

// fetcher
export httpFetcher from './plug/httpFetcher'
export relayClient from './relay/relayClient'
export relayWorker from './relay/relayWorker'

// plugins
export plugBrowser from './plug/browser'
export plugCookie from './plug/cookie'
export plugKoaCookie from './plug/koaCookie'
export plugLocalStorage from './plug/localStorage'
export plugSearchable from './plug/searchable'

// utils
export reduxDebounceSubscriber from './util/reduxDebounceSubscriber'
export runHook from './collection/util/runHook'
export getSetters from './util/getSetters'
// export { getQueryIds, onFetchById } from './collection/util/idUtil'
// export batcher from './util/batcher'
export searchObjects, { tokenizeKeywords } from './util/searchObjects'
