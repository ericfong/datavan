import _ from 'lodash'

import { _getAll } from './findInMemory'

function memorize(collection, memoryKey, func) {
  let { _memory } = collection
  const { _memoryById } = collection

  // reset cache or not
  const byId = _getAll(collection)
  const shouldReset = byId !== _memoryById
  collection._memoryById = byId
  if (shouldReset) _memory = collection._memory = {}

  // HIT
  if (memoryKey in _memory) {
    return _memory[memoryKey]
  }

  // MISS
  const ret = func(byId)

  _memory[memoryKey] = ret
  return ret
}

export function _groupBy(collection, field) {
  return memorize(collection, `groupBy-${field}`, byId => _.groupBy(byId, field))
}

export function _keyBy(collection, field) {
  return memorize(collection, `groupBy-${field}`, byId => _.keyBy(byId, field))
}

export function buildIndex(docs, fields, isUnique) {
  fields = typeof fields === 'string' ? fields.split('.') : fields
  const field = fields[0]
  if (fields.length === 1) {
    return isUnique ? _.keyBy(docs, field) : _.groupBy(docs, field)
  }
  const restSteps = fields.slice(1)
  const groups = _.groupBy(docs, field)
  return _.mapValues(groups, groupDocs => buildIndex(groupDocs, restSteps, isUnique))
}
export function _getIndex(collection, fields, isUnique) {
  return memorize(collection, `index-${fields}-${isUnique}`, byId => buildIndex(byId, fields, isUnique))
}

export function _runOnChange(collection, funcName, firstArgStr = '') {
  return memorize(collection, `run-${funcName}-${firstArgStr}`, byId => collection[funcName](byId, firstArgStr))
}
