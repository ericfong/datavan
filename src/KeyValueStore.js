import _ from 'lodash'

import { mutateState } from './util/mutateUtil'

export default class KeyValueStore {
  state = {
    byId: {},
  }

  // expect store pass-in: context, onChange(), onChangeDebounce()
  context = {}
  onChange() {}
  onChangeDebounce() {}

  importPreload(state) {
    Object.assign(this.state, state)
    this.state.byId = this.state.byId ? _.mapValues(state.byId, this.cast) : {}
  }

  getState() {
    return this.state.byId
  }

  get(id) {
    return this.state.byId[id]
  }

  mutateState(changes) {
    this.state = mutateState(this.state, changes)
  }

  // for importAll or other methods to skip setAll Override
  _setAll(change) {
    this.mutateState({ byId: change })
    this.onChangeDebounce()
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
