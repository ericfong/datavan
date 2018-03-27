import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { getDeviceName } from '../definition'

import { pickBy, buildIndex, genTmpId } from './util-external'
import { tryCache } from './util'
import { load } from './collection-load'
import { checkFetch, isPreloadSkip } from '../collection/fetcher'

const wrapPickOrFind = (coll, query, option = {}, func) => {
  if (coll.onFetch && !isPreloadSkip(coll, option)) checkFetch(coll, query, option)
  return func()
}

const wrapPickOrFindAsync = (coll, query, option = {}, func) => {
  return Promise.resolve(coll.onFetch && checkFetch(coll, query, option)).then(func)
}

const defaultCollFuncs = {
  idField: '_id',

  get(id, option = {}) {
    if (this.onFetch && !isPreloadSkip(this, option)) checkFetch(this, [id], option)
    return this.getById()[id]
  },
  pick(query, option) {
    return wrapPickOrFind(this, query, option, () => pickBy(this.getById(), query))
  },
  find(query, option) {
    return wrapPickOrFind(this, query, option, () => _.values(pickBy(this.getById(), query)))
  },
  pickAsync(coll, query, option) {
    return wrapPickOrFindAsync(coll, query, option, () => pickBy(this.getById(), query))
  },
  findAsync(coll, query, option) {
    return wrapPickOrFindAsync(coll, query, option, () => _.values(pickBy(this.getById(), query)))
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
    return genTmpId(getDeviceName(this.getDb()))
  },
  load,
}

const createCollection = (conf, name, { dispatch, getDb } = {}) => {
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
    getDb,
    dispatch: action => dispatch({ name, ...action }),
  }
}
export default createCollection
