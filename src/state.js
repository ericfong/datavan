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

export function init(core) {
  core._memory = {}
  core._fetchingPromises = {}
  const _fetchAts = (core._fetchAts = {})

  const collState = getState(core)
  const defaultState = { byId: {}, requests: {}, submits: {} }
  let _pendingState
  if (collState) {
    _pendingState = _.defaults({ ...collState }, defaultState)
    const { byId, requests } = _pendingState

    _.each(byId, (v, id) => {
      _fetchAts[id] = 1
      byId[id] = core.cast(v)
    })
    _.keys(requests).forEach(fetchKey => {
      _fetchAts[fetchKey] = 1
    })
  } else {
    _pendingState = defaultState
  }
  core._pendingState = _pendingState

  if (core.onInit) core.onInit()
}
