import _ from 'lodash'
import mutateUtil from 'immutability-helper'

export default function (table) {
  const { dv, name } = table

  let pendingState

  function getState() {
    return pendingState || (dv && dv.getState()[name])
  }

  // initState
  const collState = getState()
  const defaultState = { byId: {}, requests: {}, submits: {} }
  if (!collState) {
    pendingState = defaultState
  } else {
    pendingState = _.defaults({ ...collState }, pendingState)
  }

  return _.assign(table, {
    getState,

    addMutation(mutation, option) {
      const prevData = getState()
      const nextData = mutateUtil(prevData, mutation)
      if (nextData !== prevData) {
        pendingState = nextData
      }
      if (dv) dv.emit(option && option.flush)
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
