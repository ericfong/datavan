import _ from 'lodash'

import { getState, addMutation } from './base'
import { invalidate, reset } from './invalidate'
import runHook from './util/runHook'

export const loadAsDefaults = (v, id, self, targets) => {
  const data = self.cast(v)
  return typeof data === 'object' ? { ...data, ...targets[id] } : data
}
export const loadAsMerge = (v, id, self, targets) => {
  const data = self.cast(v)
  return typeof data === 'object' ? { ...targets[id], ...data } : data
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

function normalizeData(self, data) {
  if (Array.isArray(data)) {
    // array of docs
    const idField = self.idField
    const byId = _.mapKeys(data, (doc, i) => (doc && doc[idField]) || i)
    data = { byId }
  } else if ('byId' in data) {
    // directly use data (data may have $ops)
  } else {
    // table of docs
    data = { byId: data }
  }
  return data
}

export function load(self, _data, { mutation = {}, loadAs = loadAsMerge } = {}) {
  if (!_data) return _data
  const data = normalizeData(self, _data)

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

  if (self.onLoad) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`${self.name}.onLoad is deprecated. Please use loadHook()`)
    }
    self.onLoad(self, data, mutation)
  }
  runHook(self.loadHook, null, self, data, mutation)

  // always return data for await submit() to catch server response
  return data
}

export function init(self) {
  self._memory = {}
  self._fetchingPromises = {}
  self._byIdAts = {}
  self._fetchAts = {}

  // raw store state that not yet init
  const rawStoreState = getState(self)

  // new pending state
  self._pendingState = _.defaults({}, { byId: {}, fetchAts: {}, originals: {} })

  if (self.initState) load(self, self.initState)

  if (rawStoreState) load(self, rawStoreState)

  if (self.onInit) self.onInit(self)
}
