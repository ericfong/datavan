import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { toMutation, addMutation } from './core/mutation'
import { withId } from './core/idUtil'
import { findData } from './core/finder'
// import { submit } from './submitter'

export function setAll(core, change, option) {
  if (core.onSetAll) core.onSetAll(change, option)
  const mutation = { byId: toMutation(change) }

  if (core.onFetch) {
    let submitsChange = change
    // convert $unset to undefined in submits
    if (change.$unset) {
      submitsChange = { ...change }
      delete submitsChange.$unset
      _.each(change.$unset, id => {
        submitsChange[id] = undefined
      })
    }
    mutation.submits = toMutation(submitsChange)
  }

  addMutation(core, mutation, option)

  // NOTE require explicitly call submit
  // if (core.onFetch && core.onSubmit) submit(core, core.onSubmit)
}

export function set(core, id, value, option) {
  if (typeof id === 'object') {
    const castedDoc = withId(core, core.cast(id))
    setAll(core, { [castedDoc[core.idField]]: castedDoc }, value)
  } else {
    setAll(core, { [id]: core.cast(value) }, option)
  }
}

export function del(core, id, option) {
  setAll(core, { $unset: [id] }, option)
}

export function insert(core, docs, option) {
  const inputIsArray = Array.isArray(docs)
  const inserts = inputIsArray ? docs : [docs]

  const change = {}
  const castedDocs = _.map(inserts, d => {
    const castedDoc = withId(core, core.cast(d))
    change[castedDoc[core.idField]] = castedDoc
    return castedDoc
  })
  setAll(core, change, option)

  return inputIsArray ? castedDocs : castedDocs[0]
}

export function update(core, query, updates, option = {}) {
  const oldDocs = findData(core, query, option)
  const change = {}
  const idField = core.idField
  _.each(oldDocs, doc => {
    // TODO use mongo operators like $set, $push...
    const newDoc = mutateUtil(doc, updates)

    // delete and set the newDoc with new id
    change[doc[idField]] = undefined
    if (newDoc) {
      change[newDoc[idField]] = newDoc
    }
  })
  setAll(core, change, option)
  return oldDocs
}

export function remove(core, query, option = {}) {
  const removedDocs = findData(core, query, option)
  setAll(core, { $unset: _.map(removedDocs, core.idField) }, option)
  return removedDocs
}
