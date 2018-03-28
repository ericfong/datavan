import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { tryCache } from './util'
import { pickBy, buildIndex, genTmpId, getDeviceName } from './collection-util'
import load from './collection-load'
import mutateCollection from './collection-mutate'
import { checkFetch } from './collection-fetch'

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
  pickAsync(coll, query, option) {
    return Promise.resolve(checkFetch(coll, query, option)).then(() => pickBy(this.getById(), query))
  },
  findAsync(coll, query, option) {
    return Promise.resolve(checkFetch(coll, query, option)).then(() => _.values(pickBy(this.getById(), query)))
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
  set(...args) {
    const last = args.length - 1
    args[last] = { $set: args[last] }
    this.mutate(...args)
  },

  reset() {},
  invalidate() {},

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
    return genTmpId(getDeviceName(this.getStoreState()))
  },
  load,

  getJson() {
    return _.pick(this, 'submits', 'originals', 'fetchAts', 'preloads')
  },
}

const getCollFuncs = (conf, name, store) => {
  return {
    ...defaultCollFuncs,
    name,
    ...conf,
    mutateData(...args) {
      this.dispatch({ type: 'mutateData', args })
    },
    mutate(...args) {
      this.mutateData('submits', ...args)
    },
    getStoreState: store.getState,
    dispatch: action => store.dispatch({ name, ...action }),
  }
}

const initColl = (collFuncs, initState) => {
  let coll = Object.assign(
    _.defaults(initState, {
      // my change
      submits: {},
      originals: {},
      fetchAts: {},
      // preload that may want to keep
      preloads: {},

      // cache
      fetchingAt: null,
      cache: {},
      _fetchPromises: {},
      _byIdAts: {},
    }),
    collFuncs
  )
  if (coll.initState) {
    coll = mutateCollection(coll, coll.load(coll.initState, true))
  }
  return coll
}

const createCollection = (conf, name, store, initState) => initColl(getCollFuncs(conf, name, store), initState)

export default createCollection
