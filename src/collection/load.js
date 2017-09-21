import _ from 'lodash'

import { getState, addMutation } from './base'
import { _invalidate } from './invalidate'

export const loadAsMerge = (v, id, self, targets) => {
  const data = self.cast(v)
  return typeof data === 'object' ? { ...targets[id], ...data } : data
}

function _loop(mut = {}, items, func) {
  const $merge = {}
  let unset
  _.each(items, (value, id) => {
    if (id === '$unset') {
      unset = value
    } else {
      const v = func(value, id)
      if (v !== undefined) {
        $merge[id] = v
        mut.$merge = $merge
      }
    }
  })
  // ensure $unset in the last
  if (unset) mut.$unset = unset
  return mut
}

export function load(self, data, { mutation = {}, loadAs = loadAsMerge } = {}) {
  if (!data) return
  if (Array.isArray(data)) {
    // array of docs
    const idField = self.idField
    const byId = _.mapKeys(data, (doc, i) => (doc && doc[idField]) || i)
    data = { byId }
  } else if ('byId' in data) {
    // directly use data
  } else {
    // table of docs
    data = { byId: data }
  }

  // tables of docs / ops
  const { byId, originals } = getState(self)
  const { _byIdAts } = self
  mutation.byId = _loop(mutation.byId, data.byId, (v, id) => {
    if (id in originals) return
    _byIdAts[id] = 1
    return loadAs(v, id, self, byId)
  })
  mutation.originals = _loop(mutation.originals, data.originals, (v, id) => {
    return loadAs(v, id, self, originals)
  })
  mutation.fetchAts = _loop(mutation.fetchAts, data.fetchAts, v => v)

  if (data.$invalidate) {
    _invalidate(self, data.$invalidate)
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
  self._byIdAts = {}

  // raw store state that not yet init
  const rawStoreState = getState(self)

  if (process.env.NOVE_ENV !== 'production' && self._pendingState) {
    console.warn('Please use \'collectionSpec.initState\' instead of \'collectionSpec._pendingState\'')
  }
  const _pendingState = self._pendingState

  // new pending state
  self._pendingState = _.defaults({}, { byId: {}, fetchAts: {}, originals: {} })

  if (_pendingState) load(self, _pendingState)
  if (self.initState) load(self, self.initState)

  if (rawStoreState) load(self, rawStoreState)

  if (self.onInit) self.onInit()
}
