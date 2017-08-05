import _ from 'lodash'
import mutateUtil from 'immutability-helper'
import { toMutation } from './defaults'
import { findData } from './finder'

function withId(self, doc) {
  const idField = self.idField
  if (!doc[idField]) {
    doc[idField] = self.genId()
  }
  return doc
}

function _setData(self, change, option) {
  self.setData(change, option)
  if (!self.onFetch) return

  let submitsChange = change
  // convert $unset to undefined in submits
  if (change.$unset) {
    submitsChange = { ...change }
    delete submitsChange.$unset
    _.each(change.$unset, id => (submitsChange[id] = undefined))
  }
  self.addMutation({ submits: toMutation(submitsChange) })
}

export default {
  set(id, value, option) {
    if (typeof id === 'object') {
      const castedDoc = withId(this, this.cast(id))
      _setData(this, { [castedDoc[this.idField]]: castedDoc }, value)
    } else {
      _setData(this, { [id]: this.cast(value) }, option)
    }
  },

  del(id, option) {
    _setData(this, { $unset: [id] }, option)
  },

  insert(docs, option) {
    const inputIsArray = Array.isArray(docs)
    const inserts = inputIsArray ? docs : [docs]

    const change = {}
    const castedDocs = _.map(inserts, d => {
      const castedDoc = withId(this, this.cast(d))
      change[castedDoc[this.idField]] = castedDoc
      return castedDoc
    })
    _setData(this, change, option)

    return inputIsArray ? castedDocs : castedDocs[0]
  },

  update(query, updates, option = {}) {
    const oldDocs = findData(this, query, option)
    const change = {}
    const idField = this.idField
    _.each(oldDocs, doc => {
      // TODO use mongo operators like $set, $push...
      const newDoc = mutateUtil(doc, updates)

      // delete and set the newDoc with new id
      change[doc[idField]] = undefined
      if (newDoc) {
        change[newDoc[idField]] = newDoc
      }
    })
    _setData(this, change, option)
    return oldDocs
  },

  remove(query, option = {}) {
    const removedDocs = findData(this, query, option)
    _setData(this, { $unset: _.map(removedDocs, this.idField) }, option)
    return removedDocs
  },
}
