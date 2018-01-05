import runHook from './util/runHook'
import calcQueryKey, { serializingFields } from './util/calcQueryKey'
import { getAll } from './base'
import findInState from './findInState'

const memoryFields = [...serializingFields, 'keyByValue', 'groupBy', 'map', 'distinct']
export function _findInMemory(self, query, option = {}) {
  let { _memory } = self
  const { _memoryById } = self

  // reset cache or not
  const byId = getAll(self)
  const shouldReset = byId !== _memoryById
  self._memoryById = byId
  if (shouldReset) _memory = self._memory = {}

  // return cache if exists
  const queryKey = calcQueryKey(query, option, memoryFields)
  // console.log(self.store.vanCtx.side, 'findInMemory shouldReset', shouldReset, queryKey)
  // store queryKey for Fetcher
  option.queryKey = queryKey

  // HIT
  if (queryKey in _memory) {
    option.queryHit = true
    return _memory[queryKey]
  }

  // MISS
  const start = Date.now()
  const ret = (_memory[queryKey] = findInState(self, query, option))

  if (process.env.NODE_ENV === 'development') {
    const duration = Date.now() - start
    if (duration > 300) {
      console.warn(`Slow(${duration}ms) Find Query! Please use connectOnChange or runOnChange to cache your connect logic`)
    }
  }
  return ret
}

export function _getInMemory(self, id) {
  return getAll(self)[id]
}

export function _find(collection, query = {}, option = {}) {
  return runHook(collection.findHook, _findInMemory, collection, query, option)
}

export function _findAsync(collection, query = {}, option = {}) {
  return runHook(collection.findAsyncHook, _findInMemory, collection, query, option)
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
