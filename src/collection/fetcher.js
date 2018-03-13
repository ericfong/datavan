import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { TMP_ID_PREFIX } from '../constant'
import { load } from '../collection/load'
import { dispatchMutations } from '../store'

export const isPreloadSkip = (self, option) => !option.serverPreload && self.store && self.store.vanCtx.duringServerPreload

export function defaultGetQueryString(query, option, coll) {
  if (Array.isArray(query)) {
    query = { [coll.idField]: { $in: query } }
  }
  const opt = { ..._.omitBy(_.omit(option, 'inResponse'), (v, k) => k[0] === '_'), query }
  const sortedKeys = _.keys(opt).sort()
  return _.map(sortedKeys, k => `${encodeURIComponent(k)}=${encodeURIComponent(stringify(opt[k]))}`).join('&')
}

// @auto-fold here
function markPromiseFinally(self, key, promise) {
  const { _fetchingPromises } = self
  if (_fetchingPromises[key] === promise) {
    delete _fetchingPromises[key]
    if (Object.keys(_fetchingPromises).length === 0) {
      self.addMutation({ $merge: { fetchingAt: undefined } })
    }
  }
}
function markPromise(self, key, promise) {
  const { _fetchingPromises } = self
  // if (!overwrite) {
  const oldPromise = _fetchingPromises[key]
  if (oldPromise) return oldPromise
  // }

  promise
    .then(ret => {
      markPromiseFinally(self, key, promise)
      return ret
    })
    .catch(err => {
      markPromiseFinally(self, key, promise)
      return Promise.reject(err)
    })
  _fetchingPromises[key] = promise
  // ensure fetchingAt is set to getState() instantaneously
  const fetchingAt = Date.now()
  self.getState().fetchingAt = fetchingAt
  self.addMutation({ $merge: { fetchingAt } })
  return promise
}

const isTmpId = (id, tmpIdPrefix = TMP_ID_PREFIX) => !id || _.startsWith(id, tmpIdPrefix)
const sortUniqFilter = (ids, tmpIdPrefix) => _.filter(_.sortedUniq(ids.sort()), id => !isTmpId(id, tmpIdPrefix))
// @auto-fold here
function prepareFetchQuery(query, idField, tmpIdPrefix = TMP_ID_PREFIX) {
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

function isAllIdHit(self, query) {
  const ids = getQueryIds(query, self.idField)
  if (!ids) return false
  const { fetchMaxAge, _byIdAts } = self
  const expire = fetchMaxAge > 0 ? Date.now() - fetchMaxAge : 0
  return _.every(ids, id => _byIdAts[id] > expire)
}

export function checkFetch(coll, query = {}, option = {}) {
  const { inResponse } = option
  const notForce = !option.force

  if (notForce && !inResponse && isAllIdHit(coll, query)) return false

  const fetchQuery = prepareFetchQuery(query, coll.idField)
  if (notForce && fetchQuery === false) return false
  const queryString = (coll.getQueryString || defaultGetQueryString)(fetchQuery, option, coll)
  if (notForce && queryString === false) return false
  option.queryString = queryString

  // NOTE experiential inResponse
  if (notForce && inResponse) {
    const res = coll._inResponses[queryString]
    if (res) return res
  }

  if (notForce) {
    const { fetchAts } = coll.getState()
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
    // NOTE experiential inResponse
    if (inResponse) {
      coll._inResponses[queryString] = res
    }

    load(coll, res)
    // flush dispatch mutates after load()
    dispatchMutations(coll.store)
    return res
  })
  return markPromise(coll, queryString, p)
}

export const findRemote = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('findRemote is deprecated! It is renamed to checkFetch')
  }
  return checkFetch(...args)
}
