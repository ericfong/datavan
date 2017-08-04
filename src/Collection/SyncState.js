import _ from 'lodash'
import mutateUtil from 'immutability-helper'

export default function (self) {
  const { name } = self

  let pendingState

  function getState() {
    return pendingState || (self.dv && self.dv.getState()[name])
  }

  // initState
  const collState = getState()
  const defaultState = { byId: {}, requests: {}, submits: {} }
  if (!collState) {
    pendingState = defaultState
  } else {
    pendingState = _.defaults({ ...collState }, pendingState)
  }

  _.assign(self, {
    getState,

    addMutation(mutation, option) {
      const prevData = getState()
      const nextData = mutateUtil(prevData, mutation)
      if (nextData !== prevData) {
        pendingState = nextData
      }
      if (self.dv) self.dv.emit(option && option.flush)
      return nextData
    },

    takeMutation() {
      let ret
      if (pendingState) {
        ret = { $set: pendingState }
        pendingState = undefined
      }
      return ret
    },
  })
}
