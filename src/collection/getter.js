import { _getAll } from '.'
import { findInMemory } from './findInMemory'
import { findRemote, isPreloadSkip } from './fetcher'

export function _get(collection, id, option = {}) {
  if (collection.onFetch && option.fetch !== false && !isPreloadSkip(collection, option)) {
    findRemote(collection, [id], option)
  } else if (process.env.NODE_ENV !== 'production' && option.fetch === false) {
    console.warn('find option.fetch === false is deprecating! Please use findInMemory')
  }
  return _getAll(collection)[id]
}

export function _find(collection, query = {}, option = {}) {
  if (collection.onFetch && option.fetch !== false && !isPreloadSkip(collection, option)) {
    findRemote(collection, query, option)
  } else if (process.env.NODE_ENV !== 'production' && option.fetch === false) {
    console.warn('find option.fetch === false is deprecating! Please use findInMemory')
  }
  return findInMemory(collection, query, option)
}

export function _findAsync(collection, query = {}, option = {}) {
  if (collection.onFetch) {
    return Promise.resolve(findRemote(collection, query, option)).then(() => {
      // if (option.force && option.returnRaw) return raw
      // _preparedData no longer valid after fetch promise resolved
      delete option._preparedData
      return findInMemory(collection, query, option)
    })
  }
  return findInMemory(collection, query, option)
}

export function _findOne(core, query, option) {
  return _find(core, query, { ...option, limit: 1 })[0]
}

export function _allPendings(core) {
  return Object.values(core._fetchingPromises)
}

export function _getPending(collection) {
  const promises = Object.values(collection._fetchingPromises)
  return promises.length <= 0 ? null : Promise.all(promises)
}

export function _run(collection, funcName, ...args) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('run() is deprecated! Use getCollection() instead')
  }
  return collection[funcName](collection, ...args)
}
