import _ from 'lodash'

import { getSubmittedIds } from '../..'

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
