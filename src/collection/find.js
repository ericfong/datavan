import runHook from './util/runHook'
import { getAll } from './base'
import findInMemory from './findInMemory'

export function _getInMemory(self, id) {
  return getAll(self)[id]
}

export function _find(collection, query = {}, option = {}) {
  return runHook(collection.findHook, findInMemory, collection, query, option)
}

export function _findAsync(collection, query = {}, option = {}) {
  return runHook(collection.findAsyncHook, findInMemory, collection, query, option)
}

export function _findOne(core, query, option) {
  return _find(core, query, { ...option, limit: 1 })[0]
}

const _first = arr => arr[0]
export function _getAsync(core, id, option = {}) {
  return _findAsync(core, [id], option).then(_first)
}

export function _allPendings(core) {
  return Object.values(core._fetchingPromises)
}

export function _getPending(collection) {
  const promises = Object.values(collection._fetchingPromises)
  return promises.length <= 0 ? null : Promise.all(promises)
}

export function _run(collection, funcName, ...args) {
  return collection[funcName](collection, ...args)
}
