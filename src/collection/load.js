import _ from 'lodash'

import { reset } from './reset'

// @auto-fold here
function _loop(mut = {}, inDocs, func) {
  const $merge = {}
  _.each(inDocs, (inDoc, id) => {
    if (id[0] === '$') return
    const v = func(inDoc, id)
    if (v !== undefined) {
      $merge[id] = v
      mut.$merge = $merge
    }
  })
  return mut
}

// @auto-fold here
function submitted(self, idTable, option) {
  const { byId } = self.getState()
  const { _byIdAts } = self
  const $unset = []
  const byIdMerge = {}
  _.each(idTable, (newId, oldId) => {
    // move oldId to newId
    if (newId) {
      byIdMerge[newId] = byId[oldId]
      delete _byIdAts[oldId]
    }
    $unset.push(oldId)
  })
  self.addMutation({ byId: { $unset, $merge: byIdMerge }, originals: { $unset } }, option)
}

const toById = (data, idField) => _.mapKeys(data, (doc, i) => (doc && doc[idField]) || i)

export function normalizeLoadData(self, data) {
  if (!data) return data
  if (data.byId) {
    if (Array.isArray(data.byId)) data.byId = toById(data.byId, self.idField)
    return data
  }
  // array of docs
  if (Array.isArray(data)) return { byId: toById(data, self.idField) }
  // table of docs
  return { byId: data }
}

const loadAs = (inDoc, id, targets) => {
  return inDoc && typeof inDoc === 'object' ? _.defaults(inDoc, targets[id]) : inDoc
}

export function load(self, _data) {
  if (!_data) return _data
  const data = normalizeLoadData(self, _data)

  // move tmp id to $submittedIds before loadAsMerge
  if (data.$submittedIds) submitted(self, data.$submittedIds)

  // load byId, originals, fetchAts
  const { byId, originals } = self.getState()
  const { _byIdAts } = self
  const now = Date.now()
  const mutation = {}
  mutation.byId = _loop(mutation.byId, data.byId, (inDoc, id) => {
    if (id in originals) return
    _byIdAts[id] = now
    return loadAs(inDoc, id, byId)
  })
  mutation.originals = _loop(mutation.originals, data.originals, (inDoc, id) => {
    // original may be null
    return inDoc ? loadAs(inDoc, id, originals) : inDoc
  })

  if (data.fetchAts) {
    mutation.fetchAts = { $merge: data.fetchAts }
    if (data.fetchAts.$unset) {
      mutation.fetchAts.$unset = data.fetchAts.$unset
      delete mutation.fetchAts.$merge.$unset
    }
  }

  self.addMutation(mutation)
  // console.log(self.store.vanCtx.side, 'load', mutation.byId)

  // NOTE for server to pick-it back invalidate or reset data
  if (data.$invalidate) reset(self, { ids: data.$invalidate, mutated: false })
  if (data.$reset) reset(self, data.$reset)

  // always return original _data, so that can access raw result
  return _data
}
