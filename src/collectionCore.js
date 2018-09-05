import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import {
  genTmpId, getDeviceName, pickBy, buildIndex, flattenMutationKeys,
} from './collection-util'

// @auto-fold here
const tryCache = (cache, key, func) => {
  const c = cache[key]
  if (c) return c
  return (cache[key] = func()) // eslint-disable-line
}

const _getLocalData = (db, name, field, funcName) => {
  const coll = db.getLocalData(name)
  const fn = coll[funcName]
  return typeof fn === 'function' ? fn(coll) : coll[field]
}

export default {
  getFetchData(name) {
    return this.getDb()[name]
  },
  getLocalData(name) {
    return this.getDb()[name]
  },

  getSubmits(name) {
    return _getLocalData(this, name, 'submits', 'getSubmits')
  },
  getOriginals(name) {
    return _getLocalData(this, name, 'originals', 'getOriginals')
  },
  getPreloads(name) {
    return this.getFetchData(name).preloads
  },
  getById(name) {
    return tryCache(this.getLocalData(name)._cache, 'byId', () => ({
      ...this.getPreloads(name),
      ...this.getSubmits(name),
    }))
  },

  pickInMemory(name, query) {
    return pickBy(this.getById(name), query)
  },
  findInMemory(name, query) {
    return _.values(this.pickInMemory(name, query))
  },

  recall(name, fnName, ...args) {
    const coll = this.getLocalData(name)
    const func = coll[fnName] || (fnName === 'buildIndex' ? buildIndex : null)
    return tryCache(coll._cache, `${fnName}-${stringify(args)}`, () => func.apply(coll, [this.getById(name), ...args]))
  },

  genId() {
    return genTmpId(getDeviceName(this))
  },

  getPending(name) {
    const promises = Object.values(this[name]._fetchPromises)
    return promises.length <= 0 ? null : Promise.all(promises)
  },

  mutate(name, ...args) {
    const mutSubmits = args.reduceRight((ret, step) => ({ [step]: ret }))
    const newOriginals = {}

    const oldSubmits = this.getSubmits(name)
    const oldOriginals = this.getOriginals(name)
    const oldPreloads = this.getPreloads(name)
    // copy preloads to originals
    flattenMutationKeys(mutSubmits).forEach(id => {
      if (!(id in oldSubmits)) {
        // copy to submits to prepare mutation
        oldSubmits[id] = oldPreloads[id]
      }
      if (!(id in oldOriginals)) {
        // need to convert undefined original to null, for persist
        const newOriginal = oldPreloads[id]
        newOriginals[id] = newOriginal === undefined ? null : newOriginal
      }
    })

    this.dispatch(name, {
      submits: mutSubmits,
      originals: { $merge: newOriginals },
    })
  },
}
