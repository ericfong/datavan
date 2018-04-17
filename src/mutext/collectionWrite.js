import _ from 'lodash'

export default {
  load(name, res, returnMutation) {
    if (!name) return
    if (typeof name === 'object') {
      return this.dispatch(_.pickBy(_.mapValues(name, (data, n) => this.load(n, data, true))))
    }
    if (!res) return

    const { idField } = this[name]

    // normalizeLoadData
    let resPreloads = res.preloads || res.byId || (res.submits ? null : res)
    if (Array.isArray(resPreloads)) resPreloads = _.mapKeys(resPreloads, (doc, i) => (doc && doc[idField]) || i)

    const mutations = []

    // move tmp id to $submittedIds before loadAsMerge
    if (res.$submittedIds) {
      const $unset = Array.isArray(res.$submittedIds) ? res.$submittedIds : _.keys(res.$submittedIds)
      mutations.push({ submits: { $unset }, originals: { $unset } })
    }

    const mutation = {}
    if (resPreloads) {
      const now = Date.now()
      const { _byIdAts /* , preloads */ } = this.getFetchData(name)
      // resPreloads = _.mapValues(resPreloads, (inDoc, id) => {
      //   _byIdAts[id] = now
      //   return _.isPlainObject(inDoc) ? _.defaults(inDoc, preloads[id]) : inDoc
      // })
      // mutation.preloads = { $merge: resPreloads }
      mutation.preloads = _.mapValues(resPreloads, (inDoc, id) => {
        _byIdAts[id] = now
        return _.isPlainObject(inDoc) ? { $auto: { $merge: inDoc } } : { $set: inDoc }
      })
    }
    if (res.submits) mutation.submits = { $merge: res.submits }
    if (res.originals) mutation.originals = { $merge: res.originals }
    if (res.fetchAts) mutation.fetchAts = { $merge: res.fetchAts }
    mutations.push(mutation)

    // NOTE for server to pick-it back invalidate or reset data
    if (res.$invalidate) this.invalidate(name, res.$invalidate)
    if (res.$reset) this.reset(name, res.$reset)

    if (returnMutation) return mutations
    this.mutateData(name, mutations)
  },

  // @auto-fold here
  set(...args) {
    const last = args.length - 1
    args[last] = { $set: args[last] }
    this.mutate(...args)
  },

  // @auto-fold here
  invalidate(name, _ids) {
    if (!name) {
      return _.each(this.getConfig(), (conf, n) => this.invalidate(n))
    }
    const fetchData = this.getFetchData(name)
    fetchData._byIdAts = _ids ? _.omit(fetchData._byIdAts, _ids) : {}
    // clear all query cache
    this.mutateData(name, {
      fetchAts: { $set: {} },
      preloads: _ids ? { $unset: _ids } : { $set: {} },
    })
  },

  // @auto-fold here
  reset(name, ids) {
    if (!name) {
      return _.each(this.getConfig(), (conf, n) => this.reset(n))
    }
    this.invalidate(name, ids)
    const submits = ids ? { $unset: ids } : { $set: {} }
    this.mutateData(name, { submits, originals: submits })
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
      if (coll.onInsert) coll.onInsert(doc)
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
