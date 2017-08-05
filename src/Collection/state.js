import mutateUtil from 'immutability-helper'

export default {
  getState() {
    return this._pendingState || (this.dv && this.dv.getState()[this.name])
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
