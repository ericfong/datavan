import _ from 'lodash'
import mutateUtil from 'immutability-helper'

export default {
  constructor() {
    this._memory = {}
    this._fetchingPromises = {}
    const _fetchAts = (this._fetchAts = {})

    const collState = this.getState()
    const defaultState = { byId: {}, requests: {}, submits: {} }
    if (!collState) {
      this._pendingState = defaultState
    } else {
      this._pendingState = _.defaults({ ...collState }, defaultState)
    }

    const { byId, requests } = this._pendingState
    this._pendingState.byId = _.mapValues(byId, (v, id) => {
      _fetchAts[id] = 1
      return this.cast(v)
    })
    _.keys(requests).forEach(fetchKey => {
      _fetchAts[fetchKey] = 1
    })
  },

  getState() {
    const currState = this.dv && this.dv.getState()[this.name]
    if (currState !== this._lastState) {
      this._lastState = currState
      if (this._pendingState) {
        _.merge(this._pendingState, currState)
      }
    }
    return this._pendingState || currState
  },

  getAll() {
    return this.onGetAll()
  },

  setAll(change, option) {
    return this.onSetAll(change, option)
  },

  addMutation(mutation, option) {
    const prevState = this.getState()
    const nextState = mutateUtil(prevState, mutation)
    if (nextState !== prevState) {
      this._pendingState = nextState
      if (this.onMutate) this.onMutate(nextState.byId, prevState.byId, mutation)
      if (this.dv) this.dv.emit(option && option.flush)
    }
    return nextState
  },

  takeMutation() {
    let ret
    if (this._pendingState) {
      ret = { $set: this._pendingState }
      this._pendingState = undefined
    }
    return ret
  },
}
