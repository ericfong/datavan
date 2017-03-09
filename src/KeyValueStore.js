import _ from 'lodash'


export default class KeyValueStore {
  preloadStoreState(preloadedState) {
    preloadedState[this.name] = _.mapValues(preloadedState[this.name], doc => this.cast(doc))
  }

  // plain wrapper for _store.getState/_store.mutateState (which assigned by host store)
  // final internal functions before go to main store
  getState() {
    return this._store.getState()[this.name]
  }
  mutateState(mutation) {
    this._store.mutateState({ [this.name]: mutation })
  }


  get(id) {
    return this.getState()[id]
  }

  // Override point: all mutates should go through this point
  mutate(mutation) {
    this.mutateState(mutation)
  }

  setState(values) {
    const mutation = _.mapValues(values, v => ({$set: v}))
    this.mutate(mutation)
  }

  set(id, value) {
    if (typeof id === 'object') this.setState(id)
    else this.setState({ [id]: value })
  }

  cast(v) {
    return v
  }
}
