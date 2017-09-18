import _ from 'lodash'

export const TMP_ID_PREFIX = 'dvtmp-'
export const isTmpId = (id, tmpIdPrefix = TMP_ID_PREFIX) => !id || _.startsWith(id, tmpIdPrefix)

const sortUniq = ids => _.sortedUniq(ids.sort())
const sortUniqFilter = (ids, tmpIdPrefix) => _.filter(sortUniq(ids), id => !isTmpId(id, tmpIdPrefix))

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
      if (typeof matcher === 'string' && isTmpId(matcher, tmpIdPrefix)) {
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

export function getQueryIds(query, idField) {
  if (Array.isArray(query)) return query
  const idQuery = query[idField]
  if (idQuery) {
    if (Array.isArray(idQuery.$in)) return idQuery.$in
    if (typeof idQuery === 'string') return [idQuery]
  }
}

export function onFetchById(query, idField, func) {
  const ids = getQueryIds(query, idField)
  return Promise.all(_.map(ids, func)).then(values => _.zipObject(ids, values))
}
