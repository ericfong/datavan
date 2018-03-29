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

const getResponseById = res => res.preloads || res.byId || res

export default function load(res, returnMutation) {
  if (!res) return
  const { idField, _byIdAts } = this

  // normalizeLoadData
  let resPreloads = getResponseById(res)
  if (Array.isArray(resPreloads)) resPreloads = _.mapKeys(resPreloads, (doc, i) => (doc && doc[idField]) || i)

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
    mutations.push({ submits: { $unset, $merge: merge }, originals: { $unset }, preloads: { $unset } })
  }

  const mutation = {}
  if (resPreloads) {
    const mutPreloads = loadToMutation(resPreloads)
    const now = Date.now()
    const collPreloads = this.getPreloads()
    mutPreloads.$merge = _.mapValues(mutPreloads.$merge, (inDoc, id) => {
      _byIdAts[id] = now
      return inDoc && typeof inDoc === 'object' ? _.defaults(inDoc, collPreloads[id]) : inDoc
    })
    mutation.preloads = mutPreloads
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
