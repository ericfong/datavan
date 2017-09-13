import _ from 'lodash'
import stringify from 'fast-stable-stringify'

export function calcQueryKey(query, option) {
  return stringify([query, _.pick(option, 'sort', 'skip', 'limit', 'keyBy', 'groupBy', 'map')])
}

export function calcFetchKey(fetchQuery, option) {
  if (fetchQuery === false) return false
  if (Array.isArray(fetchQuery) && fetchQuery.length === 1) return fetchQuery[0]
  return calcQueryKey(fetchQuery, option)
}
