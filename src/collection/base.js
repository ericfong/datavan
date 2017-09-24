import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { emit } from '../store/emit'

// getState
export function getState(self) {
  return self._pendingState || (self.store && self.store.getState().datavan[self.name])
}

// mutate
export function addMutation(self, mut, option) {
  const prevState = getState(self)
  const mutation = mut || { $set: { ...prevState } }
  const nextState = mutateUtil(prevState, mutation)
  if (nextState !== prevState) {
    self._pendingState = nextState
    if (self.onMutate) self.onMutate(nextState.byId, prevState.byId, mutation)
    if (self.store) emit(self.store, option && option.flush)
  }
  return nextState
}

// ===========================================================================================
// base-methods

export function getAll(table) {
  return table.onGetAll()
}

export function _get(table, id) {
  return table.onGet(id)
}

export function getOriginals(table) {
  return getState(table).originals
}

export function getSubmits(table) {
  const { byId, originals } = getState(table)
  return _.mapValues(originals, (v, k) => byId[k])
}

export function isDirty(table, id) {
  return id in getState(table).originals
}
