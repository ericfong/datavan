import _ from 'lodash'


export default class KeyValueStore {
  // plain wrapper for getStoreState/mutateStoreState (which assigned by host store)
  // consider as final internal functions before go to main store
  getState() {
    return this.getStoreState()[this.name]
  }
  mutateState(mutation) {
    this.mutateStoreState({ [this.name]: mutation })
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
}
