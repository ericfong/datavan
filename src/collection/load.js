import _ from 'lodash'

import { getState, addMutation } from './base'

const defaultLoadAs = (v, id, table) => table.cast(v)

export const _loadAsRequest = v => v

export const getLoadMutation = (v, id, table, loadAs = defaultLoadAs, srcs) => {
  table._fetchAts[id] = Date.now()
  return { $set: loadAs(v, id, table, srcs) }
}

export function load(table, loadingState, loadAs = defaultLoadAs) {
  const { byId, originals } = getState(table)
  const mutation = { byId: {}, originals: {}, requests: {} }
  _.each(loadingState.byId, (v, id) => {
    mutation.byId[id] = getLoadMutation(v, id, table, loadAs, byId)
  })
  _.each(loadingState.originals, (v, id) => {
    mutation.originals[id] = getLoadMutation(v, id, table, loadAs, originals)
  })
  _.each(loadingState.requests, (v, fetchKey) => {
    mutation.requests[fetchKey] = getLoadMutation(v, fetchKey, table, _loadAsRequest)
  })
  addMutation(table, mutation)
}
export const loadAsDefaults = (v, id, table, targets) => {
  const data = table.cast(v)
  return typeof data === 'object' ? { ...data, ...targets[id] } : data
}
export const loadAsAssigns = (v, id, table, targets) => {
  const data = table.cast(v)
  return typeof data === 'object' ? { ...targets[id], ...data } : data
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
