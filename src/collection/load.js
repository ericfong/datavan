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

function _loop(mut = {}, items, func) {
  const $merge = {}
  _.each(items, (value, id) => {
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

export function load(self, data, { mutation = {}, loadAs = loadAsMerge } = {}) {
  if (!data) return
  if (Array.isArray(data)) {
    // array of docs
    const idField = self.idField
    const byId = _.mapKeys(data, (doc, i) => (doc && doc[idField]) || i)
    data = { byId }
  } else if ('byId' in data || 'originals' in data || 'requests' in data) {
    // directly use data
  } else {
    // table of docs
    data = { byId: data }
  }

  // tables of docs / ops
  const { byId, originals } = getState(self)
  const { _fetchAts } = self
  mutation.byId = _loop(mutation.byId, data.byId, (v, id) => {
    if (id in originals) return
    _fetchAts[id] = Date.now()
    return loadAs(v, id, self, byId)
  })
  mutation.originals = _loop(mutation.originals, data.originals, (v, id) => {
    _fetchAts[id] = Date.now()
    return loadAs(v, id, self, originals)
  })
  mutation.requests = _loop(mutation.requests, data.requests, (v, id) => {
    _fetchAts[id] = Date.now()
    return v
  })

  // explicit to invalidate some data, should to the last operation for load
  if (data.$invalidate) {
    self._fetchAts = _.omit(_fetchAts, data.$invalidate)
  }

  addMutation(self, mutation)
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
