import _ from 'lodash'

import { getState, addMutation } from './base'

export const loadAsMerge = (v, id, self, targets) => {
  const data = self.cast(v)
  return typeof data === 'object' ? { ...targets[id], ...data } : data
}

// TODO remove this
export const _loadAsRequest = v => v
// TODO remove this
export const getLoadMutation = (v, id, self, loadAs = loadAsMerge, srcs) => {
  self._fetchAts[id] = Date.now()
  return { $set: loadAs(v, id, self, srcs) }
}

function _loop(self, func) {
  const mut = {}
  const $merge = {}
  _.each(self, (value, id) => {
    if (id === '$unset') {
      mut.$unset = value
    } else {
      const v = func(value, id)
      if (v !== undefined) {
        $merge[id] = v
        mut.$merge = $merge
      }
    }
  })
  return mut
}

export function load(self, data, { loadAs = loadAsMerge } = {}) {
  if (!data) return
  if (Array.isArray(data)) {
    // array of docs
    const idField = self.idField
    data = { byId: _.keyBy(data, (doc, i) => (doc && doc[idField]) || i) }
  } else if ('byId' in data || 'originals' in data || 'requests' in data) {
    // directly use data
  } else {
    // table of docs
    data = { byId: data }
  }

  // tables of docs / ops
  const { byId, originals } = getState(self)
  const { _fetchAts } = self
  const mut = {}
  mut.byId = _loop(data.byId, (v, id) => {
    if (id in originals) return
    _fetchAts[id] = Date.now()
    return loadAs(v, id, self, byId)
  })
  mut.originals = _loop(data.originals, (v, id) => {
    _fetchAts[id] = Date.now()
    return loadAs(v, id, self, originals)
  })
  mut.requests = _loop(data.requests, (v, fetchKey) => {
    _fetchAts[fetchKey] = Date.now()
    return v
  })

  if (data.$invalidate) {
    // same as invalidateFetchAt
    self._fetchAts = _.omit(_fetchAts, data.$invalidate)
    // console.log('>>>', self._fetchAts, data.$invalidate)
  }

  addMutation(self, mut)
}
export const loadAsDefaults = (v, id, self, targets) => {
  const data = self.cast(v)
  return typeof data === 'object' ? { ...data, ...targets[id] } : data
}

export function init(self) {
  self._memory = {}
  self._fetchingPromises = {}
  self._fetchAts = {}

  // raw store state that not yet init
  const rawStoreState = getState(self)

  if (process.env.NOVE_ENV !== 'production' && self._pendingState) {
    console.warn('Please use \'collectionSpec.initState\' instead of \'collectionSpec._pendingState\'')
  }
  const _pendingState = self._pendingState

  // new pending state
  self._pendingState = _.defaults({}, { byId: {}, requests: {}, originals: {} })

  if (_pendingState) load(self, _pendingState)
  if (self.initState) load(self, self.initState)

  if (rawStoreState) load(self, rawStoreState)

  if (self.onInit) self.onInit()
}
