import _ from 'lodash'

export default class KeyValueStore {
  preloadStoreState(preloadedState) {
    preloadedState[this.name] = _.mapValues(preloadedState[this.name], doc => this.cast(doc))
  }

  // plain wrapper for _store.getState
  getState() {
    return this._store.getState()[this.name]
  }

  get(id) {
    return this.getState()[id]
  }

  // Override point: all user mutates should go through this point
  setAll(changes) {
    this._store.mutateState({ [this.name]: changes })
  }

  set(id, value) {
    this.setAll({ [id]: value })
  }

  cast(v) {
    return v
  }
}
