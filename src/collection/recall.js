import _ from 'lodash'
import stringify from 'fast-stable-stringify'

export function buildIndex(docs, fields, isUnique) {
  fields = Array.isArray(fields) ? fields : [fields]
  const field = fields[0]
  if (fields.length === 1) {
    return isUnique ? _.keyBy(docs, field) : _.groupBy(docs, field)
  }
  const restSteps = fields.slice(1)
  const groups = _.groupBy(docs, field)
  return _.mapValues(groups, groupDocs => buildIndex(groupDocs, restSteps, isUnique))
}

const _checkCache = (obj, key, value) => {
  const ret = obj[key] !== value
  obj[key] = value
  return ret
}

function memorize(coll, memoryKey, func) {
  // reset cache or not
  const state = coll.getState()
  const shouldReset = _checkCache(coll, '_memoryById', state)

  if (shouldReset) coll._memory = {}
  const _memory = coll._memory
  // HIT
  if (memoryKey in _memory) {
    return _memory[memoryKey]
  }
  // MISS
  const ret = func(coll, state)

  _memory[memoryKey] = ret
  return ret
}

export default function recall(collection, fnName, ...args) {
  const fn = collection[fnName]
  return memorize(collection, `${fnName}-${stringify(args)}`, (coll, state) => fn.call(coll, state.byId, ...args))
}
