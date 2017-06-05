import mutateHelper from 'immutability-helper'
import _ from 'lodash'

mutateHelper.extend('$unset', (keysToRemove, original) => {
  const copy = Object.assign({}, original)
  for (let i = 0, ii = keysToRemove.length; i < ii; i++) {
    delete copy[keysToRemove[i]]
  }
  return copy
})

export function mergeToStore(state, collections) {
  return mutateHelper(state, _.mapValues(collections, coll => ({ $set: coll.state })))
}

export function mutateState(state, changes) {
  // changes is two levels
  const allMutation = _.mapValues(changes, change => {
    const mutation = {}
    _.each(change, (value, key) => {
      if (key === '$unset') {
        mutation.$unset = value
        return
      }

      mutation[key] = { $set: value }
    })
    return mutation
  })
  return mutateHelper(state, allMutation)
}
