import _ from 'lodash'

import { calcQueryKey } from './SyncMemory'
import { TMP_ID_PREFIX } from './SyncDefaults'

const sortUniq = ids => _.sortedUniq(ids.sort())
const notTmpId = (id, tmpIdPrefix) => id && !_.startsWith(id, tmpIdPrefix)
const sortUniqFilter = (ids, tmpIdPrefix) => _.filter(sortUniq(ids), id => notTmpId(id, tmpIdPrefix))

function withoutTmpId(query, tmpIdPrefix = TMP_ID_PREFIX) {
  if (Array.isArray(query)) {
    const ids = sortUniqFilter(query, tmpIdPrefix)
    if (ids.length === 0) {
      return false
    }
    return ids
  }

  const fetchQuery = { ...query }
  const entries = Object.entries(query)
  for (let i = 0, ii = entries.length; i < ii; i++) {
    const [key, matcher] = entries[i]
    if (matcher) {
      if (typeof matcher === 'string' && !notTmpId(matcher, tmpIdPrefix)) {
        return false
      } else if (matcher.$in) {
        const $in = sortUniqFilter(matcher.$in, tmpIdPrefix)
        if ($in.length === 0) {
          return false
        }
        fetchQuery[key] = { $in }
      }
    }
  }
  return fetchQuery
}

function calcFetchKey(fetchQuery, option) {
  if (fetchQuery === false) return false
  if (Array.isArray(fetchQuery) && fetchQuery.length === 1) return fetchQuery[0]
  return calcQueryKey(fetchQuery, option)
}

export default function (table) {
  _.defaults(table, {
    getFetchQuery(query) {
      return withoutTmpId(query)
    },

    getFetchKey(fetchQuery, option) {
      return calcFetchKey(fetchQuery, option)
    },
  })

  return Object.assign(table, {
    onGet(data, id, option) {
      if (option && !(id in data)) {
        if (!option.missIds) option.missIds = {}
        option.missIds[id] = true
        // console.log('onGet', option)
      }
    },
  })
}
