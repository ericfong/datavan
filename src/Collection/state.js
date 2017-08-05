import _ from 'lodash'
import mutateUtil from 'immutability-helper'

export default {
  init() {
    this._memory = {}
    this._fetchingPromises = {}
    const _fetchAts = (this._fetchAts = {})

    const collState = this.getState()
    const defaultState = { byId: {}, requests: {}, submits: {} }
    if (!collState) {
      this._pendingState = defaultState
    } else {
      this._pendingState = _.defaults({ ...collState }, this._pendingState)
    }

    const { byId, requests } = this._pendingState
    this._pendingState.byId = _.mapValues(byId, v => this.cast(v))
    _.keys(requests).forEach(fetchKey => {
      _fetchAts[fetchKey] = 1
    })
  },

  getState() {
    return this._pendingState || (this.dv && this.dv.getState()[this.name])
  },

  getAll() {
    return this.onGetAll()
  },

  setAll(change, option) {
    return this.onSetAll(change, option)
  },

  addMutation(mutation, option) {
    const prevData = this.getState()
    const nextData = mutateUtil(prevData, mutation)
    if (nextData !== prevData) {
      this._pendingState = nextData
    }
    if (this.dv) this.dv.emit(option && option.flush)
    return nextData
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
