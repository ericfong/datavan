import _ from 'lodash'

function loadToMutation(inDocs) {
  const $merge = {}
  const mut = { $merge }
  _.each(inDocs, (v, id) => {
    if (id[0] === '$') {
      mut[id] = v
    } else {
      $merge[id] = v
    }
  })
  return mut
}

export default function load(res, returnMutation) {
  if (!res) return
  const { idField, _byIdAts } = this

  // normalizeLoadData
  res = res && res.byId ? res : { byId: res }
  if (Array.isArray(res.byId)) res.byId = _.mapKeys(res.byId, (doc, i) => (doc && doc[idField]) || i)

  const mutations = []

  // move tmp id to $submittedIds before loadAsMerge
  if (res.$submittedIds) {
    const submits = this.getSubmits()
    const $unset = []
    const merge = {}
    _.each(res.$submittedIds, (newId, oldId) => {
      // move oldId to newId
      if (newId && oldId in submits) {
        merge[newId] = submits[oldId]
      }
      $unset.push(oldId)
    })
    mutations.push({ submits: { $unset, $merge: merge }, originals: { $unset } })
  }

  const mutation = {}
  if (res.byId) {
    mutation.preloads = loadToMutation(res.byId)
    const now = Date.now()
    _.each(mutation.preloads.$merge, (inDoc, id) => {
      _byIdAts[id] = now
    })
  }
  if (res.submits) mutation.submits = loadToMutation(res.submits)
  if (res.originals) mutation.originals = loadToMutation(res.originals)
  if (res.fetchAts) mutation.fetchAts = loadToMutation(res.fetchAts)
  mutations.push(mutation)

  // NOTE for server to pick-it back invalidate or reset data
  // if (data.$invalidate) reset(coll, { ids: data.$invalidate, mutated: false })
  // if (data.$reset) reset(coll, data.$reset)

  if (returnMutation) return mutations
  this.mutateData(mutations)
}
