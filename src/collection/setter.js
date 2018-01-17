import _ from 'lodash'

import { findInMemory } from './findInMemory'

function _mutateAll(collection, byIdMutations) {
  const mutation = { byId: byIdMutations }

  if (collection.onFetch) {
    // keep originals
    const mutOriginals = {}
    const { originals, byId } = collection.getState()
    const keepOriginal = k => {
      if (!(k in originals)) {
        // need to convert undefined original to null, for persist
        const original = byId[k]
        mutOriginals[k] = { $set: original === undefined ? null : original }
      }
    }
    _.each(byIdMutations, (subMut, id) => {
      if (id === '$unset') {
        _.each(subMut, keepOriginal)
      } else if (id === '$merge') {
        _.each(subMut, (subSubMut, subId) => keepOriginal(subId))
      } else {
        keepOriginal(id)
      }
    })
    mutation.originals = mutOriginals
  }

  collection.addMutation(mutation)
}

const wrapDeepByPath = (steps, value) => steps.reduceRight((ret, step) => ({ [step]: ret }), value)

export function mutate(collection, path, mutation) {
  let mut
  if (typeof path === 'string') {
    mut = { [path]: mutation }
  } else if (Array.isArray(path)) {
    mut = wrapDeepByPath(path, mutation)
  } else {
    mut = path
  }
  _mutateAll(collection, mut)
}

function withId(core, doc) {
  const { idField } = core
  if (!doc[idField]) {
    doc[idField] = core.genId()
  }
  return doc
}

export function set(core, id, value) {
  // deprecated!
  if (typeof id === 'object') {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('set() a doc without id is deprecated! Please use insert()')
    }
    const castedDoc = withId(core, id)
    _mutateAll(core, { [castedDoc[core.idField]]: { $set: castedDoc } })
  } else {
    _mutateAll(core, { [id]: { $set: value } })
  }
}

export function del(core, id) {
  // deprecated!
  _mutateAll(core, { $unset: [id] })
}

export function insert(core, docs) {
  const inputIsArray = Array.isArray(docs)
  const inserts = inputIsArray ? docs : [docs]

  const merge = {}
  const castedDocs = _.map(inserts, d => {
    const castedDoc = withId(core, d)
    merge[castedDoc[core.idField]] = castedDoc
    return castedDoc
  })
  _mutateAll(core, { $merge: merge })

  return inputIsArray ? castedDocs : castedDocs[0]
}

export function update(core, query, updates, option = {}) {
  const oldDocs = findInMemory(core, query, option)
  const { idField } = core
  const mut = {}
  _.each(oldDocs, doc => {
    mut[doc[idField]] = updates
  })
  _mutateAll(core, mut)
  return oldDocs
}

export function remove(core, query, option = {}) {
  const removedDocs = findInMemory(core, query, option)
  _mutateAll(core, { $unset: _.map(removedDocs, core.idField) })
  return removedDocs
}

export function _setAll(collection, change) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('setAll() a doc without id is deprecated! Please use mutate()')
  }
  const mutation = {}
  _.each(change, (value, key) => {
    if (key === '$unset') {
      mutation.$unset = value
      return
    }
    mutation[key] = { $set: value }
  })
  _mutateAll(collection, mutation)
}
