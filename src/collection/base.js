import _ from 'lodash'

import runHook from './util/runHook'
import { DATAVAN_MUTATE } from '../constant'

// getState
export function getState(self) {
  return self.store && self.store.getState().datavan[self.name]
}

export function addMutation(self, mut) {
  self.mutatedAt = Date.now()
  const mutation = { [self.name]: mut || { _t: { $set: () => {} } } }
  if (self.store) self.store.dispatch({ type: DATAVAN_MUTATE, mutation })
}

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

const _setAll = (collection, change) => {
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

  addMutation(collection, mutation)
}
export const setAll = (collection, change, option) => runHook(collection.setAllHook, _setAll, collection, change, option)
