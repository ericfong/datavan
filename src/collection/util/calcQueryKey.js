import _ from 'lodash'
// https://github.com/nickyout/fast-stable-stringify/issues/8#issuecomment-329455969
import stringify from 'fast-stable-stringify'

// fields for backend DB select columns
// fetchName for backend fetch api name
// fetch object for backend fetch parameters
const serializingFields = ['sort', 'skip', 'limit', 'keyBy', 'groupBy', 'map', 'fields', 'fetch', 'fetchName']

export const pickOptionForSerialize = option => _.pick(option, serializingFields)

export default function calcQueryKey(query, option) {
  if (query === false) return false
  if (Array.isArray(query) && query.length === 1) return query[0]
  return stringify([query, pickOptionForSerialize(option)])
}
