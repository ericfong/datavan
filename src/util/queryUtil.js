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
    if (key === idField) {
      // key=idField, id(s) query muse be truthly
      if (!matcher) {
        return null
      }
      if (typeof matcher === 'string') {
        query[idField] = { $in: [matcher] }
      } else if (matcher.$in) {
        let ids = _.compact(_.sortedUniq(matcher.$in.sort()))
        if (idExcluder) {
          ids = _.filter(ids, id => !idExcluder(id))
        }
        if (ids.length === 0) {
          return null
        }
        matcher.$in = ids
      }
    } else if (matcher && matcher.$in) {
      matcher.$in = _.sortedUniq(matcher.$in.sort())
      if (matcher.$in.length === 0) {
        return null
      }
    }
  }
  return query
}

export function fetchIdInQuery(query, func) {
  const id = query[0]
  return { [id]: func(id) }
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
