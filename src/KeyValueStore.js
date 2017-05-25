import _ from 'lodash'

import { setChanges } from './util/mutateUtil'

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

  // for importAll or other methods to skip setAll Override
  _setAll(changes) {
    this.state = setChanges(this.state, changes)
    this.onChangeDebounce()
  }

  // Override point: all user mutates should go through this point
  setAll(changes) {
    this.state = setChanges(this.state, changes)
    this.onChange()
  }

  set(id, value) {
    this.setAll({ byId: { [id]: value } })
  }

  del(id) {
    this.setAll({ byId: { [id]: undefined } })
  }

  cast(v) {
    return v
  }
}
