import _ from 'lodash'

import { calcQueryKey } from './memory'

export const TMP_ID_PREFIX = 'dvtmp-'
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

// @auto-fold here
export function toMutation(change) {
  const mutation = {}
  _.each(change, (value, key) => {
    if (key === '$unset') {
      mutation.$unset = value
      return
    }
    mutation[key] = { $set: value }
  })
  return mutation
}

function calcFetchKey(fetchQuery, option) {
  if (fetchQuery === false) return false
  if (Array.isArray(fetchQuery) && fetchQuery.length === 1) return fetchQuery[0]
  return calcQueryKey(fetchQuery, option)
}

export function markMissIds(data, id, option) {
  if (option && !(id in data)) {
    if (!option.missIds) option.missIds = {}
    option.missIds[id] = true
  }
}

export default {
  // Sync
  idField: '_id',

  onGetAll() {
    return this.getState().byId
  },

  onGet(id, option) {
    const data = this.onGetAll()
    if (this.onFetch) markMissIds(data, id, option)
    return data[id]
  },

  onSetAll(change, option) {
    this.addMutation({ byId: toMutation(change) }, option)
  },

  cast(v) {
    return v
  },

  genId() {
    return _.uniqueId(TMP_ID_PREFIX)
  },

  onFind() {},

  // --------------------------------
  // Async

  getFetchQuery(query) {
    return withoutTmpId(query, this.idField)
  },

  getFetchKey(fetchQuery, option) {
    return calcFetchKey(fetchQuery, option)
  },
}
