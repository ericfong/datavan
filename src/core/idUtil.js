import _ from 'lodash'

export const TMP_ID_PREFIX = 'dvtmp-'
const sortUniq = ids => _.sortedUniq(ids.sort())
const notTmpId = (id, tmpIdPrefix) => id && !_.startsWith(id, tmpIdPrefix)
const sortUniqFilter = (ids, tmpIdPrefix) => _.filter(sortUniq(ids), id => notTmpId(id, tmpIdPrefix))

export function withoutTmpId(query, idField, tmpIdPrefix = TMP_ID_PREFIX) {
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

export function withId(core, doc) {
  const idField = core.idField
  if (!doc[idField]) {
    doc[idField] = core.genId()
  }
  return doc
}
