import _ from 'lodash'

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

export function runHook(hook, next, ...args) {
  if (hook) return hook(next, ...args)
  if (next) return next(...args)
}

const _getAll = collection => getState(collection).byId
export const getAll = collection => runHook(collection.getAllHook, _getAll, collection)

// =============================================
// Setter

export function _mutateAll(collection, mutations) {
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
