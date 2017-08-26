import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { emit } from '../van'
import { getState } from '../state'

export function toMutation(change) {
  const mutation = {}
  _.each(change, (value, key) => {
    if (key === '$unset') {
      mutation.$unset = value
      return
    }
    mutation[key] = { $set: value }
  })
  return mutation
}

export function addMutation(core, mutation, option) {
  const prevState = getState(core)
  const nextState = mutateUtil(prevState, mutation)
  if (nextState !== prevState) {
    core._pendingState = nextState
    if (core.onMutate) core.onMutate(nextState.byId, prevState.byId, mutation)
    if (core.van) emit(core.van, option && option.flush)
  }
  return nextState
}

export function takeMutation(core) {
  let ret
  if (core._pendingState) {
    ret = { $set: core._pendingState }
    core._pendingState = undefined
  }
  return ret
}
