import _ from 'lodash'
import mutateUtil from 'immutability-helper'

export default function (table) {
  const { idField, genId, cast, setData, findData } = table

  function withId(doc) {
    if (!doc[idField]) {
      doc[idField] = genId()
    }
    return doc
  }

  return Object.assign(table, {
    set(id, value, option) {
      if (typeof id === 'object') {
        const castedDoc = withId(cast(id))
        setData({ [castedDoc[idField]]: castedDoc }, value)
      } else {
        setData({ [id]: cast(value) }, option)
      }
    },

    del(id, option) {
      setData({ $unset: [id] }, option)
    },

    insert(docs, option) {
      const inputIsArray = Array.isArray(docs)
      const inserts = inputIsArray ? docs : [docs]

      const change = {}
      const castedDocs = _.map(inserts, d => {
        const castedDoc = withId(cast(d))
        change[castedDoc[idField]] = castedDoc
        return castedDoc
      })
      setData(change, option)

      return inputIsArray ? castedDocs : castedDocs[0]
    },

    update(query, updates, option = {}) {
      const oldDocs = findData(query, option)
      const change = {}
      _.each(oldDocs, doc => {
        // TODO use mongo operators like $set, $push...
        const newDoc = mutateUtil(doc, updates)

        // delete and set the newDoc with new id
        change[doc[idField]] = undefined
        if (newDoc) {
          change[newDoc[idField]] = newDoc
        }
      })
      setData(change, option)
      return oldDocs
    },

    remove(query, option = {}) {
      const removedDocs = findData(query, option)
      setData({ $unset: _.map(removedDocs, idField) }, option)
      return removedDocs
    },
  })
}
