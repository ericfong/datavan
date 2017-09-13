import _ from 'lodash'
import stringify from 'fast-stable-stringify'

const ops = ['sort', 'skip', 'limit', 'keyBy', 'groupBy', 'map']
const fetchOps = [...ops, 'fields']

export function calcQueryKey(query, option) {
  return stringify([query, _.pick(option, ops)])
}

export function calcFetchKey(fetchQuery, option) {
  if (fetchQuery === false) return false
  if (Array.isArray(fetchQuery) && fetchQuery.length === 1) return fetchQuery[0]
  return stringify([fetchQuery, _.pick(option, fetchOps)])
}
