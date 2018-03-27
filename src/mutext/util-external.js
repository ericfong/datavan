import _ from 'lodash'
import Mingo from 'mingo'

import { TMP_ID_PREFIX, startsWith$$ } from '../definition'

export const genTmpId = deviceName => `${TMP_ID_PREFIX}${new Date().toISOString()}~${Math.random()}~${deviceName || ''}`

export const buildIndex = (docs, fields, isUnique) => {
  fields = Array.isArray(fields) ? fields : [fields]
  const field = fields[0]
  if (fields.length === 1) {
    return isUnique ? _.keyBy(docs, field) : _.groupBy(docs, field)
  }
  const restSteps = fields.slice(1)
  const groups = _.groupBy(docs, field)
  return _.mapValues(groups, groupDocs => buildIndex(groupDocs, restSteps, isUnique))
}

//
// -------------------------------------------------------------------------------------------------------------------
// Query, Tester
// -------------------------------------------------------------------------------------------------------------------

export const mingoQuery = query => new Mingo.Query(_.omitBy(query, startsWith$$))
export const mingoTester = query => {
  const mQuery = mingoQuery(query)
  return doc => mQuery.test(doc)
}

//
// -------------------------------------------------------------------------------------------------------------------
// pickBy, queryData
// -------------------------------------------------------------------------------------------------------------------

export const pickBy = (byId, query) => {
  if (typeof query === 'string' || Array.isArray(query)) return _.pick(byId, query)
  const omittedQuery = _.omitBy(query, startsWith$$)
  if (_.isEmpty(omittedQuery)) return byId
  const mQuery = new Mingo.Query(omittedQuery)
  return _.pickBy(byId, doc => mQuery.test(doc))
}
