import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { genTmpId, getDeviceName, pickBy, buildIndex } from './collection-util'

// @auto-fold here
const tryCache = (cache, key, func) => {
  const c = cache[key]
  if (c) return c
  return (cache[key] = func()) // eslint-disable-line
}

const getData = (db, name, field, funcName) => {
  const coll = db.getLatestDb()[name]
  const fn = coll[funcName]
  return typeof fn === 'function' ? fn(coll) : coll[field]
}

export default {
  getFetchData(name) {
    return this.getLatestDb()[name]
  },

  getSubmits(name) {
    return getData(this, name, 'submits', 'getSubmits')
  },
  getOriginals(name) {
    return getData(this, name, 'originals', 'getOriginals')
  },
  getPreloads(name) {
    return this.getFetchData(name).preloads
  },
  getById(name) {
    return tryCache(this.getLatestDb()[name]._cache, 'byId', () => ({ ...this.getPreloads(name), ...this.getSubmits(name) }))
  },

  pickInMemory(name, query) {
    return pickBy(this.getById(name), query)
  },
  findInMemory(name, query) {
    return _.values(this.pickInMemory(name, query))
  },

  recall(name, fnName, ...args) {
    const coll = this.getLatestDb()[name]
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

  mutateData(name, mutation) {
    this.dispatch({ [name]: mutation })
  },
  mutate(name, ...args) {
    const mutSubmits = args.reduceRight((ret, step) => ({ [step]: ret }))
    const newOriginals = {}

    const oldSubmits = this.getSubmits(name)
    const oldOriginals = this.getOriginals(name)
    const oldPreloads = this.getPreloads(name)
    // copy preloads to originals
    const _keepOriginal = k => {
      if (!(k in oldSubmits)) {
        // copy to submits to prepare mutation
        oldSubmits[k] = oldPreloads[k]
      }
      if (!(k in oldOriginals)) {
        // need to convert undefined original to null, for persist
        const newOriginal = oldPreloads[k]
        newOriginals[k] = newOriginal === undefined ? null : newOriginal
      }
    }
    _.each(mutSubmits, (submit, id) => {
      if (id === '$unset') {
        _.each(submit, _keepOriginal)
      } else if (id === '$merge') {
        _.each(submit, (subSubMut, subId) => _keepOriginal(subId))
      } else {
        _keepOriginal(id)
      }
    })

    this.mutateData(name, { submits: mutSubmits, originals: { $merge: newOriginals } })
  },
}
