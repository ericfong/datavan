import _ from 'lodash'

import { getSubmittedIds } from '..'
import { getQueryIds } from '../collection/util/idUtil'

const echoSubmitArr = docs =>
  _.reduce(
    docs,
    (ret, doc, oldId) => {
      if (doc) {
        ret.push({ ...doc, _key: oldId, _id: `stored-${Math.random()}` })
      }
      return ret
    },
    []
  )

export const echoSubmit = (docs, collection) => {
  const arr = echoSubmitArr(docs)
  const $submittedIds = getSubmittedIds(collection, docs, arr, '_key')
  return { byId: _.keyBy(arr, '_id'), $submittedIds }
}

export class EchoDB {
  byId = {}
  idField = '_id'

  fetch = query => {
    return _.map(getQueryIds(query, this.idField), id => {
      if (!id) return undefined
      // console.log('>>f>', id, this.byId)
      if (this.byId[id]) return this.byId[id]
      return { [this.idField]: id, name: _.toUpper(id) }
    })
  }

  submit = (docs, collection) => {
    const storeds = _.reduce(
      docs,
      (ret, _doc) => {
        if (_doc) {
          const doc = { ..._doc }
          let id = doc[this.idField]
          if (!_.startsWith(id, 'stored-')) {
            doc._key = id
            id = doc[this.idField] = `stored-${Math.random()}`
          }
          ret[id] = doc
          this.byId[id] = doc
          // console.log('>>s>', id, this.byId)
        }
        return ret
      },
      {}
    )
    const $submittedIds = getSubmittedIds(collection, docs, storeds, '_key')
    return { byId: _.keyBy(storeds, this.idField), $submittedIds }
  }
}
