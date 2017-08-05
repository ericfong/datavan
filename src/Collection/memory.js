import _ from 'lodash'
import stringify from 'fast-stable-stringify'
import { findData } from './finder'

export function calcQueryKey(query, option) {
  return stringify([query, _.pick(option, 'sort', 'skip', 'limit', 'keyBy', 'groupBy', 'map')])
}

export function findMemory(self, query, option) {
  let { _memory } = self
  const { _memoryById } = self

  // reset cache or not
  const byId = self.getData()
  const shouldReset = byId !== _memoryById
  self._memoryById = byId
  if (shouldReset) _memory = self._memory = {}

  // return cache if exists
  const queryKey = calcQueryKey(query, option)
  // store queryKey for Fetcher
  option.queryKey = queryKey

  // HIT
  // console.log('findMemory', queryKey in queryCaches, queryKey)
  if (queryKey in _memory) {
    return _memory[queryKey]
  }

  // MISS
  return (_memory[queryKey] = findData(self, query, option))
}

// findMemoryOnly(query, option) {
//   return queryCaches[calcQueryKey(query, option)]
// },
