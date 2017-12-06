import _ from 'lodash'
// https://github.com/nickyout/fast-stable-stringify/issues/8#issuecomment-329455969
import stringify from 'fast-stable-stringify'

// fields for backend DB select columns
// fetchName for backend fetch api name
// fetch object for backend fetch parameters
export const serializingFields = ['sort', 'skip', 'limit', 'keyBy', 'fields', 'fetch', 'fetchName', 'inOriginal']

export const pickOptionForSerialize = (option, fields = serializingFields) => _.pick(option, fields)

export default function calcQueryKey(query, option, fields) {
  if (query === false) return false
  if (Array.isArray(query) && query.length === 1) return query[0]
  return stringify([query, pickOptionForSerialize(option, fields)])
}
