import calcQueryKey from './util/calcQueryKey'
import findInState from './findInState'

export function getInMemory(self, id) {
  return self.getAll()[id]
}

export default function findInMemory(self, query, option = {}) {
  let { _memory } = self
  const { _memoryById } = self

  // reset cache or not
  const byId = self.getAll()
  const shouldReset = byId !== _memoryById
  self._memoryById = byId
  if (shouldReset) _memory = self._memory = {}

  // return cache if exists
  const queryKey = calcQueryKey(query, option)
  // store queryKey for Fetcher
  option.queryKey = queryKey

  // HIT
  if (queryKey in _memory) {
    option.queryHit = true
    return _memory[queryKey]
  }
  // console.log('findInMemory', queryKey, _memory[queryKey])

  // MISS
  const ret = (_memory[queryKey] = findInState(self, query, option))
  return ret
}
