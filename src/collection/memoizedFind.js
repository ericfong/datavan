import _ from 'lodash'

import { calcQueryKey } from './util/keyUtil'
import { getState } from './base'
import doFind from './doFind'

function findDataOrRequest(self, query, option) {
  // request-only (only for Fetcher case?)
  if (query.$request) {
    if (Object.keys(query).length === 1) {
      return getState(self).requests[option.queryKey]
    }
    query = _.omit(query, '$request')
  }

  return doFind(self, query, option)
}

export default function memoizedFind(self, query, option) {
  let { _memory } = self
  // if (option.cacheOnly) return _memory[calcQueryKey(query, option)]
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
  if (queryKey in _memory) {
    return _memory[queryKey]
  }

  // MISS
  const ret = (_memory[queryKey] = findDataOrRequest(self, query, option))
  return ret
}
