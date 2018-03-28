import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { TMP_ID_PREFIX } from './collection-util'

const isPreloadSkip = (coll, option) => !option.serverPreload && coll.getStoreState().duringServerPreload

export const defaultGetQueryString = (query, option, coll) => {
  if (Array.isArray(query)) query = { [coll.idField]: { $in: query } }
  return stringify({ ..._.omitBy(option, (v, k) => k[0] === '_'), ...query })
}

// @auto-fold here
const markPromiseDone = (coll, key, promise) => {
  const { _fetchPromises } = coll
  if (_fetchPromises[key] === promise) {
    delete _fetchPromises[key]
    if (Object.keys(_fetchPromises).length === 0) {
      coll.mutateData({ $merge: { fetchingAt: undefined } })
    }
  }
}
const markPromise = (coll, key, promise) => {
  const { _fetchPromises } = coll
  const oldPromise = _fetchPromises[key]
  if (oldPromise) return oldPromise

  promise
    .then(ret => {
      markPromiseDone(coll, key, promise)
      return ret
    })
    .catch(err => {
      markPromiseDone(coll, key, promise)
      return Promise.reject(err)
    })
  _fetchPromises[key] = promise
  // ensure fetchingAt is set to coll instantaneously
  const fetchingAt = Date.now()
  coll.fetchingAt = fetchingAt
  coll.mutateData({ $merge: { fetchingAt } })
  return promise
}

const isTmpId = (id, tmpIdPrefix = TMP_ID_PREFIX) => !id || _.startsWith(id, tmpIdPrefix)
const sortUniqFilter = (ids, tmpIdPrefix) => _.filter(_.sortedUniq(ids.sort()), id => !isTmpId(id, tmpIdPrefix))
// @auto-fold here
const prepareFetchQuery = (query, idField, tmpIdPrefix = TMP_ID_PREFIX) => {
  if (!query) return query

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

export const getQueryIds = (query, idField) => {
  if (!query || Array.isArray(query)) return query
  const idQuery = query[idField]
  if (idQuery) {
    if (Array.isArray(idQuery.$in)) return idQuery.$in
    if (typeof idQuery === 'string') return [idQuery]
  }
}

const isAllIdHit = (coll, query) => {
  const ids = getQueryIds(query, coll.idField)
  if (!ids) return false
  const { fetchMaxAge, _byIdAts } = coll
  const expire = fetchMaxAge > 0 ? Date.now() - fetchMaxAge : 0
  return _.every(ids, id => _byIdAts[id] > expire)
}

export function checkFetch(coll, query, option = {}) {
  if (!coll.onFetch || isPreloadSkip(coll, option)) return false

  const notForce = !option.force

  if (notForce && isAllIdHit(coll, query)) return false

  const fetchQuery = prepareFetchQuery(query, coll.idField)
  if (notForce && fetchQuery === false) return false
  const queryString = (coll.getQueryString || defaultGetQueryString)(fetchQuery, option, coll)
  if (notForce && queryString === false) return false
  option.queryString = queryString

  if (notForce) {
    const { fetchAts } = coll
    const now = Date.now()
    // collection.fetchMaxAge: 1, // in seconds; null, 0 or -1 means no maxAge
    const { fetchMaxAge } = coll
    // console.log('>>>', queryString, fetchAts, fetchAts[queryString])
    if (fetchMaxAge > 0 ? fetchAts[queryString] > now - fetchMaxAge : fetchAts[queryString]) {
      return false
    }
    fetchAts[queryString] = now
  }

  // want to return fetching promise for findAsync
  const { onFetch } = coll
  const p = Promise.resolve(onFetch(fetchQuery, option, coll)).then(res => {
    coll.load(res)
    return res
  })
  return markPromise(coll, queryString, p)
}
