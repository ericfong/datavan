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
  mutate(mutation) {
    this._store.mutateState({ [this.name]: mutation })
  }

  setState(values) {
    const mutation = _.mapValues(values, v => ({$set: v}))
    this.mutate(mutation)
  }

  set(id, value) {
    // TODO comment out for LocalStorage.js, should migrate that use remote data source style?
    // this.mutate({ [id]: {$set: value} })
    this.setState({ [id]: value })
  }

  cast(v) {
    return v
  }
}
