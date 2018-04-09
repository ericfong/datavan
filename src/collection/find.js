import _ from 'lodash'
import Mingo from 'mingo'

import { startsWith$$, isInResponseQuery } from '../definition'
import { getAll } from '.'
import { checkFetch, isPreloadSkip } from './fetcher'

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

export const queryData = (coll, query, option) => {
  const state = coll.getState()
  let { byId, originals } = state

  if (option.queryString && isInResponseQuery(query)) {
    const ids = coll._inResponses[option.queryString]
    byId = _.pick(byId, ids)
    originals = _.pick(originals, ids)
  }

  if (option.inOriginal) {
    byId = _.omitBy({ ...byId, ...originals }, v => v === null)
  }
  return byId
}

//
// -------------------------------------------------------------------------------------------------------------------
// pickInMemory, findInMemory
// -------------------------------------------------------------------------------------------------------------------
export const pickInMemory = (coll, query, option = {}) => pickBy(queryData(coll, query, option), query)
export const findInMemory = (coll, query, option) => _.values(pickInMemory(coll, query, option))

//
// -------------------------------------------------------------------------------------------------------------------
// get, pick, find
// -------------------------------------------------------------------------------------------------------------------
export const get = (coll, id, option = {}) => {
  if (coll.onFetch && !isPreloadSkip(coll, option)) checkFetch(coll, [id], option)
  return getAll(coll)[id]
}
const _find = (func, coll, query, option = {}) => {
  if (coll.onFetch && !isPreloadSkip(coll, option)) checkFetch(coll, query, option)
  return func(coll, query, option)
}
export const pick = (coll, query, option) => _find(pickInMemory, coll, query, option)
export const find = (coll, query, option) => _find(findInMemory, coll, query, option)

//
// -------------------------------------------------------------------------------------------------------------------
// pickAsync, findAsync
// -------------------------------------------------------------------------------------------------------------------
const _findAsync = (func, coll, query, option = {}) =>
  Promise.resolve(coll.onFetch && checkFetch(coll, query, option)).then(() => func(coll, query, option))
export const pickAsync = (coll, query, option) => _findAsync(pickInMemory, coll, query, option)
export const findAsync = (coll, query, option) => _findAsync(findInMemory, coll, query, option)
