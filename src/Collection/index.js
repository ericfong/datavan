import _ from 'lodash'

import state from './state'
import defaults from './defaults'
import setter from './setter'
import submitter from './submitter'
import fetcher from './fetcher'

export function runMixin(self, mixin) {
  if (typeof mixin === 'function') {
    mixin(self)
  } else {
    Object.assign(self, mixin)
  }
}

const collection = Object.assign(state, setter, submitter, fetcher)

function initState(self) {
  const collState = self.getState()
  const defaultState = { byId: {}, requests: {}, submits: {} }
  if (!collState) {
    self._pendingState = defaultState
  } else {
    self._pendingState = _.defaults({ ...collState }, self._pendingState)
  }

  self._memory = {}
  self._fetchingPromises = {}
  const _fetchAts = (self._fetchAts = {})
  // _.each(pendingState.byId, setTimeFunc)
  _.keys(self.getState().requests).forEach(fetchKey => (_fetchAts[fetchKey] = 1))
}

export default function create(self, override, definition) {
  _.defaults(self, defaults, collection)
  initState(self)
  if (definition) runMixin(self, definition)
  if (override) runMixin(self, override)
  return self
}
