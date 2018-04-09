import _ from 'lodash'

import { getQueryIds } from '../collection-fetch'

const arrToValues = (arr, func) => _.mapValues(_.keyBy(arr), func)

export const echoValue = query => Promise.resolve(arrToValues(getQueryIds(query, '_id'), id => _.toUpper(id)))

export const onFetchEcho = query =>
  Promise.resolve(_.map(getQueryIds(query, '_id'), _id => (_id ? { _id, name: _.toUpper(_id) } : undefined)))

export const onFetchById = (query, idField, func) => {
  const ids = getQueryIds(query, idField)
  return Promise.all(_.map(ids, func)).then(values => _.zipObject(ids, values))
}
