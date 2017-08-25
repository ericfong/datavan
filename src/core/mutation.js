import _ from 'lodash'
import mutateUtil from 'immutability-helper'

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
  const prevState = core.getState()
  const nextState = mutateUtil(prevState, mutation)
  if (nextState !== prevState) {
    core._pendingState = nextState
    if (core.onMutate) core.onMutate(nextState.byId, prevState.byId, mutation)
    if (core.dv) core.dv.emit(option && option.flush)
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
