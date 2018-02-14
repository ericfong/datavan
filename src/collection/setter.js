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

// shortcut of mutate with $merge?
export function set(coll, path, value) {
  mutate(coll, path, { $set: value })
}

function withId(core, doc) {
  const { idField } = core
  if (!doc[idField]) {
    doc[idField] = core.genId()
  }
  return doc
}
export function insert(coll, docs) {
  const inputIsArray = Array.isArray(docs)
  const inserts = inputIsArray ? docs : [docs]

  const merge = {}
  const insertedDocs = _.map(inserts, d => {
    const doc = withId(coll, d)
    coll.onInsert(doc)
    merge[doc[coll.idField]] = doc
    return doc
  })
  _mutateAll(coll, { $merge: merge })

  return inputIsArray ? insertedDocs : insertedDocs[0]
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
