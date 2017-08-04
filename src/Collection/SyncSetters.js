import _ from 'lodash'
import mutateUtil from 'immutability-helper'

function withId(self, doc) {
  const idField = self.idField
  if (!doc[idField]) {
    doc[idField] = self.genId()
  }
  return doc
}

export default function (self) {
  const { findData } = self

  Object.assign(self, {
    set(id, value, option) {
      if (typeof id === 'object') {
        const castedDoc = withId(self, self.cast(id))
        self.setData({ [castedDoc[self.idField]]: castedDoc }, value)
      } else {
        self.setData({ [id]: self.cast(value) }, option)
      }
    },

    del(id, option) {
      self.setData({ $unset: [id] }, option)
    },

    insert(docs, option) {
      const inputIsArray = Array.isArray(docs)
      const inserts = inputIsArray ? docs : [docs]

      const change = {}
      const castedDocs = _.map(inserts, d => {
        const castedDoc = withId(self, self.cast(d))
        change[castedDoc[self.idField]] = castedDoc
        return castedDoc
      })
      self.setData(change, option)

      return inputIsArray ? castedDocs : castedDocs[0]
    },

    update(query, updates, option = {}) {
      const oldDocs = findData(query, option)
      const change = {}
      const idField = self.idField
      _.each(oldDocs, doc => {
        // TODO use mongo operators like $set, $push...
        const newDoc = mutateUtil(doc, updates)

        // delete and set the newDoc with new id
        change[doc[idField]] = undefined
        if (newDoc) {
          change[newDoc[idField]] = newDoc
        }
      })
      self.setData(change, option)
      return oldDocs
    },

    remove(query, option = {}) {
      const removedDocs = findData(query, option)
      self.setData({ $unset: _.map(removedDocs, self.idField) }, option)
      return removedDocs
    },
  })
}
