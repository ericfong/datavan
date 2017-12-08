import _ from 'lodash'

import { getState, addMutation } from './base'
import { invalidate, reset } from './invalidate'

export const loadAsDefaults = (data, id, self, targets) => {
  // const data = self.cast(v)
  return data && typeof data === 'object' ? { ...data, ...targets[id] } : data
}
export const loadAsMerge = (data, id, self, targets) => {
  // const data = self.cast(v)
  return data && typeof data === 'object' ? { ...targets[id], ...data } : data
}

// @auto-fold here
function _loop(mut = {}, items, func) {
  const $merge = {}
  _.each(items, (value, id) => {
    if (id[0] === '$') return
    const v = func(value, id)
    if (v !== undefined) {
      $merge[id] = v
      mut.$merge = $merge
    }
  })
  return mut
}

function submitted(self, idTable, option) {
  const { byId } = getState(self)
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
  addMutation(self, { byId: { $unset, $merge: byIdMerge }, originals: { $unset } }, option)
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

export function load(self, _data, { mutation = {}, loadAs = loadAsMerge } = {}) {
  if (!_data) return _data
  const data = normalizeLoadData(self, _data)

  // move tmp id to $submittedIds before loadAsMerge or loadAsDefaults
  if (data.$submittedIds) submitted(self, data.$submittedIds)

  // load byId, originals, fetchAts
  const { byId, originals } = getState(self)
  const { _byIdAts, _fetchAts } = self
  const now = Date.now()
  mutation.byId = _loop(mutation.byId, data.byId, (v, id) => {
    if (id in originals) return
    _byIdAts[id] = now
    return loadAs(v, id, self, byId)
  })
  mutation.originals = _loop(mutation.originals, data.originals, (v, id) => {
    // original may be null
    return v ? loadAs(v, id, self, originals) : v
  })
  mutation.fetchAts = _loop(mutation.fetchAts, data.fetchAts, (v, id) => {
    _fetchAts[id] = now
    return v
  })

  addMutation(self, mutation)
  // console.log(self.store.vanCtx.side, 'load', mutation.byId)

  // NOTE for server to pick-it back invalidate or reset data
  if (data.$invalidate) invalidate(self, data.$invalidate)
  if (data.$reset) reset(self, data.$reset)

  if (self.onLoad) self.onLoad(self, data, mutation)

  // always return original _data, so that can access raw result
  return _data
}

export function init(self) {
  self._memory = {}
  self._fetchingPromises = {}
  self._byIdAts = {}
  self._fetchAts = {}

  // raw store state that not yet init
  // const rawStoreState = getState(self)

  if (self.initState) load(self, self.initState)

  // if (rawStoreState) load(self, rawStoreState)

  if (self.onInit) self.onInit(self)
}
