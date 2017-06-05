import _ from 'lodash'

import { mutateState } from './util/mutateUtil'

export default class KeyValueStore {
  constructor(state) {
    this.state = state
    state.byId = state.byId ? _.mapValues(state.byId, this.cast) : {}
  }

  // Override: context, onChange(), onChangeDebounce()
  context = {}
  onChange() {}
  onChangeDebounce() {}

  getState() {
    return this.state.byId
  }

  get(id) {
    return this.state.byId[id]
  }

  mutateState(changes) {
    this.state = mutateState(this.state, changes)
  }

  // Override point: all user mutates should go through this point
  setAll(change) {
    this.mutateState({ byId: change })
    this.onChange()
  }

  set(id, value) {
    this.setAll({ [id]: value })
  }

  del(id) {
    this.setAll({ [id]: undefined })
  }

  cast(v) {
    return v
  }
}
