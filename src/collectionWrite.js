import _ from 'lodash'

// @auto-fold here
const runCast = (coll, funcName, doc) => {
  if (coll[funcName]) {
    const newDoc = coll[funcName](doc)
    return newDoc === undefined ? doc : newDoc
  }
  return doc
}

export default {
  load(name, res, returnMutation) {
    if (!name) return
    if (typeof name === 'object') {
      return this.dispatch(_.compact(_.flatMap(name, (data, n) => this.load(n, data, true))))
    }
    if (!res) return
    const coll = this[name]
    const { idField } = coll

    // normalizeLoadData
    let resPreloads = res.preloads || res.byId || (res.submits ? null : res)
    if (Array.isArray(resPreloads)) resPreloads = _.mapKeys(resPreloads, (doc, i) => (doc && doc[idField]) || i)

    const actions = []

    // move tmp id to $submittedIds before loadAsMerge
    if (res.$submittedIds) {
      const $unset = Array.isArray(res.$submittedIds) ? res.$submittedIds : _.keys(res.$submittedIds)
      actions.push({ name, mutation: { submits: { $unset }, originals: { $unset } } })
    }

    const mutation = {}
    if (resPreloads) {
      const now = Date.now()
      const { _byIdAts } = this.getFetchData(name)
      mutation.preloads = _.mapValues(resPreloads, (doc, id) => {
        _byIdAts[id] = now
        doc = runCast(coll, 'onLoad', doc)
        return _.isPlainObject(doc) ? { $auto: { $merge: doc } } : { $set: doc }
      })
    }
    if (res.submits) mutation.submits = { $merge: res.submits }
    if (res.originals) mutation.originals = { $merge: res.originals }
    if (res.fetchAts) mutation.fetchAts = { $merge: res.fetchAts }
    actions.push({ name, mutation })

    // NOTE for server to pick-it back invalidate or reset data
    if (res.$invalidate) this.invalidate(name, res.$invalidate)
    if (res.$reset) this.reset(name, res.$reset)

    if (returnMutation) return actions
    this.dispatch(actions)
  },

  // @auto-fold here
  set(...args) {
    const last = args.length - 1
    args[last] = { $set: args[last] }
    this.mutate(...args)
  },

  invalidate(name, ids) {
    if (!name) return _.each(this.getConfig(), (conf, n) => this.invalidate(n))
    if (ids && ids.length === 0) return
    this.dispatch(name, {
      _byIdAts: ids ? { $unset: ids } : { $set: {} },
      _fetchResults: { $set: {} },
      fetchAts: { $set: {} },
      preloads: ids ? { $unset: ids } : { $set: {} },
    })
  },

  reset(name, ids, opt = {}) {
    if (!name) return _.each(this.getConfig(), (conf, n) => this.reset(n, null, opt))
    if (ids && ids.length === 0) return
    if (!opt.submitsOnly) this.invalidate(name, ids)
    const submits = ids ? { $unset: ids } : { $set: {} }
    // use resetAt to always trigger re-render (not sure it is always needed?)
    this.dispatch(name, { submits, originals: submits, resetAt: { $set: Date.now() } })
  },

  // @auto-fold here
  insert(name, docs) {
    const inputIsArray = Array.isArray(docs)
    const inserts = inputIsArray ? docs : [docs]
    const merge = {}
    const coll = this[name]
    const { idField } = coll
    const insertedDocs = _.map(inserts, doc => {
      let id = doc[idField]
      if (!id) id = doc[idField] = this.genId()
      doc = runCast(coll, 'onInsert', doc)
      merge[id] = doc
      return doc
    })
    this.mutate(name, { $merge: merge })
    return inputIsArray ? insertedDocs : insertedDocs[0]
  },

  // @auto-fold here
  update(name, query, updates) {
    const oldDocs = this.pickInMemory(name, query)
    const { idField } = this[name]
    const mut = {}
    _.each(oldDocs, doc => {
      mut[doc[idField]] = updates
    })
    this.mutate(name, mut)
    return oldDocs
  },

  // @auto-fold here
  remove(name, query) {
    const removedDocs = this.pickInMemory(name, query)
    this.mutate(name, { $unset: _.keys(removedDocs) })
    return removedDocs
  },
}
