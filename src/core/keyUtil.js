import { calcQueryKey } from './memory'

export function calcFetchKey(fetchQuery, option) {
  if (fetchQuery === false) return false
  if (Array.isArray(fetchQuery) && fetchQuery.length === 1) return fetchQuery[0]
  return calcQueryKey(fetchQuery, option)
}
