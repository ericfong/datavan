import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { TMP_ID_PREFIX } from './collection-util'

const isPreloadSkip = (coll, option) => !option.serverPreload && coll.getDb().duringServerPreload

export const defaultGetFetchKey = (query, option) => {
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
  if (key !== undefined) return promise
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

const isTmpId = id => !id || _.startsWith(id, TMP_ID_PREFIX)
const sortUniqFilter = ids => _.filter(_.sortedUniq(ids.sort()), id => !isTmpId(id))
// @auto-fold here
const prepareFetchQuery = (query, idField) => {
  if (!query) return query

  if (Array.isArray(query)) {
    const ids = sortUniqFilter(query)
    if (ids.length === 0) return false
    return { [idField]: { $in: ids } }
  }

  const fetchQuery = { ...query }
  const entries = Object.entries(query)
  for (let i = 0, ii = entries.length; i < ii; i++) {
    const [key, matcher] = entries[i]
    if (matcher) {
      if (typeof matcher === 'string' && isTmpId(matcher)) {
        return false
      } else if (matcher.$in) {
        const $in = sortUniqFilter(matcher.$in)
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

  const idFieldStr = fetchQuery[idField]
  if (typeof idFieldStr === 'string') {
    fetchQuery[idField] = { $in: [idFieldStr] }
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

export default {
  doFetch(fetchQuery, option = {}, fetchKey) {
    if (fetchKey !== undefined) this.fetchAts[fetchKey] = Date.now()
    const p = Promise.resolve(this.onFetch(fetchQuery, option, this)).then(res => {
      this.load(res)
      return res
    })
    return markPromise(this, fetchKey, p)
  },
}

export function checkFetch(coll, query, option = {}) {
  const { onFetch } = coll
  if (!onFetch || isPreloadSkip(coll, option)) return false

  const fetchQuery = prepareFetchQuery(query, coll.idField)
  const notForce = !option.force
  if (notForce && fetchQuery === false) return false
  if (notForce && isAllIdHit(coll, fetchQuery)) return false

  const fetchKey = (coll.getFetchKey || defaultGetFetchKey)(fetchQuery, option)
  if (notForce && fetchKey === false) return false
  option._fetchKey = fetchKey

  if (notForce) {
    // collection.fetchMaxAge: 1, // in seconds; null, 0 or -1 means no maxAge
    const { fetchMaxAge, fetchAts } = coll
    const now = Date.now()
    // console.log('>>>', fetchKey, fetchAts, fetchAts[fetchKey])
    if (fetchMaxAge > 0 ? fetchAts[fetchKey] > now - fetchMaxAge : fetchAts[fetchKey]) {
      return false
    }
  }

  return coll.doFetch(fetchQuery, option, fetchKey)
}
