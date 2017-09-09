import _ from 'lodash'

import { getQueryIds } from './findUtil'
import { calcQueryKey } from './memoryUtil'

export function calcFetchKey(fetchQuery, option) {
  if (fetchQuery === false) return false
  if (Array.isArray(fetchQuery) && fetchQuery.length === 1) return fetchQuery[0]
  return calcQueryKey(fetchQuery, option)
}

export function onFetchById(query, idField, func) {
  const ids = getQueryIds(query, idField)
  return Promise.all(_.map(ids, func)).then(values => _.zipObject(ids, values))
}
