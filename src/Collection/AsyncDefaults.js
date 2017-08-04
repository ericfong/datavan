import _ from 'lodash'

import { calcQueryKey } from './SyncMemory'
import { TMP_ID_PREFIX } from './SyncDefaults'

const sortUniq = ids => _.sortedUniq(ids.sort())
const notTmpId = (id, tmpIdPrefix) => id && !_.startsWith(id, tmpIdPrefix)
const sortUniqFilter = (ids, tmpIdPrefix) => _.filter(sortUniq(ids), id => notTmpId(id, tmpIdPrefix))

// @auto-fold here
function withoutTmpId(query, idField, tmpIdPrefix = TMP_ID_PREFIX) {
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
      if (typeof matcher === 'string' && _.startsWith(matcher, tmpIdPrefix)) {
        return false
      } else if (matcher.$in) {
        const $in = sortUniqFilter(matcher.$in, tmpIdPrefix)
        if ($in.length === 0) {
          return false
        }
        fetchQuery[key] = { $in }
      }
    } else if (key === idField) {
      // idField is falsy
      return false
    }
  }
  return fetchQuery
}

function calcFetchKey(fetchQuery, option) {
  if (fetchQuery === false) return false
  // if (option.missIds) return Object.keys(option.missIds).sort().join()
  // if (Array.isArray(fetchQuery) && fetchQuery.length === 1) return fetchQuery[0]
  return calcQueryKey(fetchQuery, option)
}

export default function (self) {
  _.defaults(self, {
    getFetchQuery(query) {
      return withoutTmpId(query, self.idField)
    },

    getFetchKey(fetchQuery, option) {
      return calcFetchKey(fetchQuery, option)
    },
  })

  Object.assign(self, {
    onGet(data, id, option) {
      if (option && !(id in data)) {
        if (!option.missIds) option.missIds = {}
        option.missIds[id] = true
        // console.log('onGet', option)
      }
    },
  })
}
