import _ from 'lodash'
import stringfy from 'fast-stable-stringify'

export function normalizeQuery(query, idField, idExcluder) {
  if (!query) {
    return {}
  }
  // query is array of ids
  if (Array.isArray(query)) {
    return query.sort()
  }

  const entries = Object.entries(query)
  for (let i = 0, ii = entries.length; i < ii; i++) {
    const [key, matcher] = entries[i]
    if (matcher) {
      if (matcher.$in) {
        matcher.$in = _.sortedUniq(matcher.$in.sort())
        if (matcher.$in.length === 0) {
          return null
        } else if (key === idField) {
          // key=idField & _id.$in (id query muse be truthly)
          matcher.$in = _.compact(matcher.$in)
          if (idExcluder) {
            matcher.$in = _.filter(matcher.$in, id => !idExcluder(id))
          }
          if (matcher.$in.length === 0) return null
        }
      }
    } else if (key === idField) {
      // key=idField & !id, id query muse be truthly
      return null
    }
  }
  return query
}

export function mongoToLodash(sort) {
  const fields = []
  const orders = []
  _.each(sort, (v, k) => {
    fields.push(k)
    orders.push(v < 0 ? 'desc' : 'asc')
  })
  return [fields, orders]
}

export function calcFindKey(query, option) {
  return stringfy([query, _.pick(option, 'sort', 'skip', 'limit', 'keyBy', 'groupBy')])
}

export const emptyResultArray = []
