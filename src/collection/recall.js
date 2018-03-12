import _ from 'lodash'
import stringify from 'fast-stable-stringify'

const tryCache = (obj, key, value) => {
  const ret = obj[key] !== value
  obj[key] = value
  return ret
}

function memorize(coll, memoryKey, func) {
  // reset cache or not
  const state = coll.getState()
  const shouldReset = tryCache(coll, '_memoryById', state)

  if (shouldReset) coll._memory = {}
  const _memory = coll._memory

  // HIT
  if (memoryKey in _memory) {
    return _memory[memoryKey]
  }

  // MISS
  const ret = func(state)

  _memory[memoryKey] = ret
  return ret
}

export function _calcOnChange(collection, funcName, firstArgStr = '') {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('calcOnChange() is deprecated! Please use recall() instead')
  }
  return memorize(collection, `run-${funcName}-${firstArgStr}`, state => collection[funcName](state.byId, firstArgStr))
}

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

export function _getIndex(collection, fields, isUnique) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('getIndex() is deprecated! Please use recall(collection, func, ...args) instead')
  }
  return memorize(collection, `index-${fields}-${isUnique}`, state => buildIndex(state.byId, fields, isUnique))
}

const getFunc = (collection, func) => {
  if (typeof func === 'function') return func
  const collFunc = collection[func]
  if (typeof collFunc === 'function') return collFunc
}

export default function recall(collection, func, ...args) {
  let fn = getFunc(collection, func)
  if (!fn) {
    args.unshift(func)
    fn = buildIndex
  }
  const funcName = fn.name || ''
  return memorize(collection, `${funcName}-${stringify(args)}`, state => fn(state.byId, ...args))
}
