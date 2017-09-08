import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { emit } from '../store/emit'

const vanState = store => store.getState().datavan
const getStoreTableState = table => table.store && vanState(table.store)[table.name]
export function getState(table) {
  const currState = getStoreTableState(table)
  if (currState !== table._lastState) {
    table._lastState = currState
    if (table._pendingState) {
      // convert to load?
      _.merge(table._pendingState, currState)
    }
  }
  return table._pendingState || currState
}

export function addMutation(table, mut, option) {
  const prevState = getState(table)
  const mutation = mut || { $set: { ...prevState } }
  const nextState = mutateUtil(prevState, mutation)
  if (nextState !== prevState) {
    table._pendingState = nextState
    if (table.onMutate) table.onMutate(nextState.byId, prevState.byId, mutation)
    if (table.store) emit(table.store, option && option.flush)
  }
  return nextState
}

// move out the following?

export function getAll(table) {
  return table.onGetAll()
}

export function _get(table, id) {
  return table.onGet(id)
}
