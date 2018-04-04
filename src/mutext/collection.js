import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { pickBy, buildIndex, genTmpId, getDeviceName, mutateCollection } from './collection-util'
import load from './collection-load'
import { checkFetch } from './collection-fetch'

// @auto-fold here
const tryCache = (cache, key, func) => {
  const c = cache[key]
  if (c) return c
  return (cache[key] = func()) // eslint-disable-line
}

const defaultCollFuncs = {
  idField: '_id',
  // fetchMaxAge: 0,
  // onFetch: () => {},

  get(id, option = {}) {
    checkFetch(this, [id], option)
    return this.getById()[id]
  },
  pick(query, option) {
    checkFetch(this, query, option)
    return pickBy(this.getById(), query)
  },
  find(query, option) {
    checkFetch(this, query, option)
    return _.values(pickBy(this.getById(), query))
  },
  pickAsync(query, option) {
    return Promise.resolve(checkFetch(this, query, option)).then(() => pickBy(this.getDb()[this.name].getById(), query))
  },
  findAsync(query, option) {
    return Promise.resolve(checkFetch(this, query, option)).then(() => _.values(pickBy(this.getDb()[this.name].getById(), query)))
  },

  getSubmits() {
    return this.submits
  },
  getOriginals() {
    return this.originals
  },
  getPreloads() {
    return this.preloads
  },
  getById() {
    return tryCache(this.cache, 'byId', () => ({ ...this.getPreloads(), ...this.getSubmits() }))
  },
  recall(fnName, ...args) {
    const func = this[fnName] || (fnName === 'buildIndex' ? buildIndex : null)
    return tryCache(this.cache, `${fnName}-${stringify(args)}`, () => func.apply(this, [this.getById(), ...args]))
  },

  getPending() {
    const promises = Object.values(this._fetchPromises)
    return promises.length <= 0 ? null : Promise.all(promises)
  },

  onInsert: () => {},
  // cast: () => {},

  // @auto-fold here
  mutateData(...args) {
    const mutation = args.reduceRight((ret, step) => ({ [step]: ret }))
    if (mutation.submits) {
      const { preloads, submits, originals } = this
      // copt preloads to originals
      const newOriginals = {}
      const _keepOriginal = k => {
        if (!(k in submits)) {
          // copy to submits to prepare mutation
          submits[k] = preloads[k]
        }
        if (!(k in originals)) {
          // need to convert undefined original to null, for persist
          const newOriginal = preloads[k]
          newOriginals[k] = newOriginal === undefined ? null : newOriginal
        }
      }
      _.each(mutation.submits, (submit, id) => {
        if (id === '$unset') {
          _.each(submit, _keepOriginal)
        } else if (id === '$merge') {
          _.each(submit, (subSubMut, subId) => _keepOriginal(subId))
        } else {
          _keepOriginal(id)
        }
      })
      mutation.originals = { $merge: newOriginals }
    }
    this.dispatch(mutation)
  },
  // @auto-fold here
  mutate(...args) {
    this.mutateData('submits', ...args)
  },
  // @auto-fold here
  set(...args) {
    const last = args.length - 1
    args[last] = { $set: args[last] }
    this.mutate(...args)
  },

  // @auto-fold here
  reset(ids) {
    this.invalidate(ids)
    const mut = {}
    mut.submits = ids ? { $unset: ids } : { $set: {} }
    mut.originals = mut.byId
    this.mutateData(mut)
  },
  // @auto-fold here
  invalidate(_ids) {
    this._byIdAts = _ids ? _.omit(this._byIdAts, _ids) : {}
    const delIds = _ids || Object.keys(this.getPreloads())
    // if any change in byIds, clear all query cache
    if (delIds.length > 0) {
      this.mutateData('fetchAts', { $set: {} })
    }
  },

  // @auto-fold here
  insert(docs) {
    const inputIsArray = Array.isArray(docs)
    const inserts = inputIsArray ? docs : [docs]
    const merge = {}
    const { idField } = this
    const insertedDocs = _.map(inserts, doc => {
      let id = doc[idField]
      if (!id) id = doc[idField] = this.genId()
      this.onInsert(doc)
      merge[id] = doc
      return doc
    })
    this.mutate({ $merge: merge })
    return inputIsArray ? insertedDocs : insertedDocs[0]
  },

  // @auto-fold here
  update(query, updates) {
    const oldDocs = pickBy(this.getById(), query)
    const { idField } = this
    const mut = {}
    _.each(oldDocs, doc => {
      mut[doc[idField]] = updates
    })
    this.mutate(mut)
    return oldDocs
  },

  // @auto-fold here
  remove(query) {
    const removedDocs = pickBy(this.getById(), query)
    this.mutate({ $unset: _.map(removedDocs, this.idField) })
    return removedDocs
  },

  genId() {
    return genTmpId(getDeviceName(this.getDb()))
  },
  load,

  getJson() {
    return _.pick(this, 'submits', 'originals', 'preloads', 'fetchAts')
  },
}

const getCollFuncs = (conf, name, db) => {
  return {
    ...defaultCollFuncs,
    name,
    ...conf,

    getDb: db.getState,
    dispatch: mutation => db.dispatch({ [name]: mutation }),
    getConfig: () => conf,
  }
}

const initColl = collFuncs => {
  let coll = {
    // local persist
    submits: {},
    originals: {},
    // local memory
    cache: {},

    // conf-level persist
    preloads: {},
    fetchAts: {},
    // conf-level memory
    fetchingAt: null,
    _fetchPromises: {},
    _byIdAts: {},

    ...collFuncs,
  }
  if (coll.initState) {
    coll = mutateCollection(coll, coll.load(coll.initState, true))
  }
  return coll
}

const createCollection = (conf, name, db) => {
  return initColl(getCollFuncs(conf, name, db))
}

export default createCollection
