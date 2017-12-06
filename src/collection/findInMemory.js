import calcQueryKey, { serializingFields } from './util/calcQueryKey'
import { getAll } from './base'
import findInState from './findInState'

export function getInMemory(self, id) {
  return getAll(self)[id]
}

const memoryFields = [...serializingFields, 'keyByValue', 'groupBy', 'map', 'distinct']

export default function findInMemory(self, query, option = {}) {
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
  const ret = (_memory[queryKey] = findInState(self, query, option))
  return ret
}
