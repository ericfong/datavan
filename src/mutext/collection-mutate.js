import _ from 'lodash'
import mutateUtil from 'immutability-helper'

const addNewOriginals = (prev, mutationSubmits) => {
  const { preloads, originals } = prev
  // copt preloads to originals
  const newOriginals = {}
  const _keepOriginal = k => {
    if (!(k in originals)) {
      // need to convert undefined original to null, for persist
      const newOriginal = preloads[k]
      newOriginals[k] = newOriginal === undefined ? null : newOriginal
    }
  }
  _.each(mutationSubmits, (submit, id) => {
    if (id === '$unset') {
      _.each(submit, _keepOriginal)
    } else if (id === '$merge') {
      _.each(submit, (subSubMut, subId) => _keepOriginal(subId))
    } else {
      _keepOriginal(id)
    }
  })
  return { $merge: newOriginals }
}

export const mutateCollection = (prev, mutation) => {
  if (Array.isArray(mutation)) {
    return mutation.reduce((r, m) => mutateCollection(r, m), prev)
  }

  mutation.originals = addNewOriginals(prev, mutation.submits)

  const next = mutateUtil(prev, mutation)
  if (next !== prev) {
    next.cache = {}
    return next
  }
  return next
}
