import _ from 'lodash'

function memorize(collection, memoryKey, func) {
  let { _memory } = collection
  const { _memoryById } = collection

  // reset cache or not
  const byId = collection.getAll()
  const shouldReset = byId !== _memoryById
  collection._memoryById = byId
  if (shouldReset) _memory = collection._memory = {}

  // HIT
  if (memoryKey in _memory) {
    return _memory[memoryKey]
  }

  // MISS
  const ret = func()

  _memory[memoryKey] = ret
  return ret
}

export function _groupBy(collection, field) {
  return memorize(collection, `groupBy-${field}`, () => _.groupBy(collection.getAll(), field))
}

export function _keyBy(collection, field) {
  return memorize(collection, `groupBy-${field}`, () => _.keyBy(collection.getAll(), field))
}

export function _runOnChange(collection, funcName, firstArgStr = '') {
  return memorize(collection, `run-${funcName}-${firstArgStr}`, () => collection[funcName](firstArgStr))
}
