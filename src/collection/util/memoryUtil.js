import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { getState } from '../base'
import { findData } from './findUtil'

export function calcQueryKey(query, option) {
  return stringify([query, _.pick(option, 'sort', 'skip', 'limit', 'keyBy', 'groupBy', 'map')])
}

function findDataOrRequest(self, query, option) {
  // request-only (only for Fetcher case?)
  if (query.$request) {
    if (Object.keys(query).length === 1) {
      return getState(self).requests[option.queryKey]
    }
    query = _.omit(query, '$request')
  }

  return findData(self, query, option)
}

export function findMemory(self, query, option) {
  let { _memory } = self
  const { _memoryById } = self

  // reset cache or not
  const byId = self.onGetAll()
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
  const ret = (_memory[queryKey] = findDataOrRequest(self, query, option))
  return ret
}

// findMemoryOnly(query, option) {
//   return queryCaches[calcQueryKey(query, option)]
// },
