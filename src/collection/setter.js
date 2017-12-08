import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { mutateAll, setAll } from './base'
import findInMemory from './findInMemory'

function withId(core, doc) {
  const { idField } = core
  if (!doc[idField]) {
    doc[idField] = core.genId()
  }
  return doc
}

export function mutate(collection, id, mutation) {
  mutateAll(collection, { [id]: mutation })
}

export function set(core, id, value) {
  if (typeof id === 'object') {
    // const castedDoc = withId(core, core.cast(id))
    const castedDoc = withId(core, id)
    setAll(core, { [castedDoc[core.idField]]: castedDoc })
  } else {
    // setAll(core, { [id]: core.cast(value) })
    setAll(core, { [id]: value })
  }
}

export function del(core, id) {
  setAll(core, { $unset: [id] })
}

export function insert(core, docs) {
  const inputIsArray = Array.isArray(docs)
  const inserts = inputIsArray ? docs : [docs]

  const change = {}
  const castedDocs = _.map(inserts, d => {
    // const castedDoc = withId(core, core.cast(d))
    const castedDoc = withId(core, d)
    change[castedDoc[core.idField]] = castedDoc
    return castedDoc
  })
  setAll(core, change)

  return inputIsArray ? castedDocs : castedDocs[0]
}

export function update(core, query, updates, option = {}) {
  const oldDocs = findInMemory(core, query, option)
  const change = {}
  const { idField } = core
  _.each(oldDocs, doc => {
    // TODO use mongo operators like $set, $push...
    const newDoc = mutateUtil(doc, updates)

    // delete and set the newDoc with new id
    change[doc[idField]] = undefined
    if (newDoc) {
      change[newDoc[idField]] = newDoc
    }
  })
  setAll(core, change)
  return oldDocs
}

export function remove(core, query, option = {}) {
  const removedDocs = findInMemory(core, query, option)
  setAll(core, { $unset: _.map(removedDocs, core.idField) })
  return removedDocs
}
