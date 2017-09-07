import _ from 'lodash'

import { addMutation } from './core/mutation'

function vanState(store) {
  return store.getState().datavan
}

export function getState(core) {
  const currState = core.store && vanState(core.store)[core.name]
  if (currState !== core._lastState) {
    core._lastState = currState
    if (core._pendingState) {
      _.merge(core._pendingState, currState)
    }
  }
  return core._pendingState || currState
}

export function getAll(core) {
  return core.onGetAll()
}

export function _get(core, id) {
  return core.onGet(id)
}

// const mergeDoc = (target, src, asDefault) => (typeof src === 'object' ? (asDefault ? { ...src, ...target } : { ...target, ...src }) : src)
const defaultConvert = (v, id, table) => table.cast(v)
const convertRequest = v => v
const _convertToMutation = (v, id, table, convert = defaultConvert, srcs) => {
  table._fetchAts[id] = Date.now()
  return { $set: convert(v, id, table, srcs) }
}
export function load(table, loadingState, convert = defaultConvert) {
  const { byId, originals } = getState(table)
  const mutation = { byId: {}, originals: {}, requests: {} }
  _.each(loadingState.byId, (v, id) => {
    mutation.byId[id] = _convertToMutation(v, id, table, convert, byId)
  })
  _.each(loadingState.originals, (v, id) => {
    mutation.originals[id] = _convertToMutation(v, id, table, convert, originals)
  })
  _.each(loadingState.requests, (v, fetchKey) => {
    mutation.requests[fetchKey] = _convertToMutation(v, fetchKey, table, convertRequest)
  })
  addMutation(table, mutation)
}

export function init(table) {
  table._memory = {}
  table._fetchingPromises = {}
  table._fetchAts = {}

  table._pendingState = { byId: {}, requests: {}, originals: {} }

  load(table, getState(table))

  if (table.onInit) table.onInit()
}
