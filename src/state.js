import _ from 'lodash'

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
