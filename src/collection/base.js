import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import runHook from './util/runHook'
import { emit } from '../store/emit'

// getState
export function getState(self) {
  return self._pendingState || (self.store && self.store.getState().datavan[self.name])
}

// mutate
export function addMutation(self, mut, option) {
  const prevState = getState(self)
  const mutation = mut || { $set: { ...prevState } }
  const nextState = mutateUtil(prevState, mutation)
  if (nextState !== prevState) {
    self._pendingState = nextState
    self.mutatedAt = Date.now()
    // console.log(self.store.vanCtx.side, 'addMutation', self.mutatedAt)
    if (self.onMutate) self.onMutate(nextState.byId, prevState.byId, mutation)
    if (self.store) emit(self.store, option && option.flush)
  }
  return nextState
}
// export const genForceMutation = () => ({ _t: { $set: () => {} } })

// =============================================
// Getter

const _getAll = collection => getState(collection).byId
export const getAll = collection => runHook(collection.getAllHook, _getAll, collection)

const _get = (collection, id) => getAll(collection)[id]
export const get = (collection, id) => runHook(collection.getHook, _get, collection, id)

// =============================================
// Setter

// @auto-fold here
function toMutation(change) {
  const mutation = {}
  _.each(change, (value, key) => {
    if (key === '$unset') {
      mutation.$unset = value
      return
    }
    mutation[key] = { $set: value }
  })
  return mutation
}

const _setAll = (collection, change, option) => {
  const mutation = { byId: toMutation(change) }

  if (collection.onFetch) {
    // keep originals
    const mutOriginals = {}
    const { originals, byId } = getState(collection)
    const keepOriginal = k => {
      if (!(k in originals)) {
        // need to convert undefined original to null, for persist
        const original = byId[k]
        mutOriginals[k] = { $set: original === undefined ? null : original }
      }
    }
    _.each(change, (value, key) => {
      if (key === '$unset') {
        _.each(value, keepOriginal)
        return
      }
      keepOriginal(key)
    })
    mutation.originals = mutOriginals
  }

  addMutation(collection, mutation, option)
}
export const setAll = (collection, change, option) => runHook(collection.setAllHook, _setAll, collection, change, option)
