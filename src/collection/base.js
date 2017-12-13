import _ from 'lodash'

import runHook from './util/runHook'

// getState
export function getState(self) {
  return self.store && self.store.getState().datavan[self.name]
}

// also used for background load, invalidate
export function addMutation(self, mutation) {
  self.mutatedAt = Date.now()
  self.store.vanCtx.mutates.push({ collection: self.name, mutation })
}

// =============================================
// Getter

const _getAll = collection => getState(collection).byId
export const getAll = collection => runHook(collection.getAllHook, _getAll, collection)

const _get = (collection, id) => getAll(collection)[id]
export const get = (collection, id) => runHook(collection.getHook, _get, collection, id)

// =============================================
// Setter

const _mutateAll = (collection, mutations) => {
  const mutation = { byId: mutations }

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
    _.each(mutations, (value, key) => {
      if (key === '$unset' || key === '$merge') {
        _.each(value, keepOriginal)
        return
      }
      keepOriginal(key)
    })
    mutation.originals = mutOriginals
  }

  addMutation(collection, mutation)
}
export const mutateAll = (collection, mutations) => runHook(collection.mutateAllHook, _mutateAll, collection, mutations)

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
  mutateAll(collection, toMutation(change))
}
export const setAll = (collection, change, option) => runHook(collection.setAllHook, _setAll, collection, change, option)
