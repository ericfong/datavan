import _ from 'lodash'

import { getState, addMutation } from './base'

export const loadAsMerge = (v, id, table, targets) => {
  const data = table.cast(v)
  return typeof data === 'object' ? { ...targets[id], ...data } : data
}

// TODO remove this
export const _loadAsRequest = v => v
// TODO remove this
export const getLoadMutation = (v, id, table, loadAs = loadAsMerge, srcs) => {
  table._fetchAts[id] = Date.now()
  return { $set: loadAs(v, id, table, srcs) }
}

function _loop(table, func) {
  const mut = {}
  const $merge = {}
  _.each(table, (value, id) => {
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

export function load(table, data, { loadAs = loadAsMerge } = {}) {
  if (!data) return
  if (Array.isArray(data)) {
    // array of docs
    const idField = table.idField
    data = { byId: _.keyBy(data, (doc, i) => (doc && doc[idField]) || i) }
  } else if ('byId' in data || 'originals' in data || 'requests' in data) {
    // directly use data
  } else {
    // table of docs
    data = { byId: data }
  }

  // tables of docs / ops
  const { byId, originals } = getState(table)
  const { _fetchAts } = table
  const mut = {}
  mut.byId = _loop(data.byId, (v, id) => {
    if (id in originals) return
    _fetchAts[id] = Date.now()
    return loadAs(v, id, table, byId)
  })
  mut.originals = _loop(data.originals, (v, id) => {
    _fetchAts[id] = Date.now()
    return loadAs(v, id, table, originals)
  })
  mut.requests = _loop(data.requests, (v, fetchKey) => {
    _fetchAts[fetchKey] = Date.now()
    return v
  })

  if (data.$invalidate) {
    // same as invalidateFetchAt
    table._fetchAts = _.omit(_fetchAts, data.$invalidate)
    // console.log('>>>', table._fetchAts, data.$invalidate)
  }

  addMutation(table, mut)
}
export const loadAsDefaults = (v, id, table, targets) => {
  const data = table.cast(v)
  return typeof data === 'object' ? { ...data, ...targets[id] } : data
}

export function init(table) {
  table._memory = {}
  table._fetchingPromises = {}
  table._fetchAts = {}

  // raw store state that not yet init
  const rawStoreState = getState(table)

  // new pending state
  table._pendingState = _.defaults(table._pendingState || {}, { byId: {}, requests: {}, originals: {} })

  if (rawStoreState) load(table, rawStoreState)

  if (table.onInit) table.onInit()
}
