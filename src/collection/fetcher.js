import _ from 'lodash'
// https://github.com/nickyout/fast-stable-stringify/issues/8#issuecomment-329455969
// import stringify from 'fast-stable-stringify'

import { TMP_ID_PREFIX } from '../constant'
import { load } from '../collection/load'
import { dispatchMutations } from '../store'
import { prepareFindData } from './findInMemory'

export const isPreloadSkip = (self, option) => !option.serverPreload && self.store && self.store.vanCtx.duringServerPreload

function defaultGetQueryString(query, option) {
  // if (Array.isArray(query) && query.length === 1) return query[0]
  // return stringify([query, _.omitBy(option, (v, k) => k[0] === '_')])
  const opt = { ..._.omitBy(option, (v, k) => k[0] === '_'), query }
  const sortedKeys = _.keys(opt).sort()
  return _.map(sortedKeys, k => `${k}=${JSON.stringify(opt[k])}`).join('&')
}

// @auto-fold here
function markPromise(self, key, promise, overwrite) {
  const { _fetchingPromises } = self
  if (!overwrite) {
    const oldPromise = _fetchingPromises[key]
    if (oldPromise) return oldPromise
  }

  promise
    .then(ret => {
      if (_fetchingPromises[key] === promise) {
        delete _fetchingPromises[key]
        self.addMutation(null) // force render to update isFetching
      }
      return ret
    })
    .catch(err => {
      if (_fetchingPromises[key] === promise) {
        delete _fetchingPromises[key]
        self.addMutation(null) // force render to update isFetching
      }
      return Promise.reject(err)
    })
  _fetchingPromises[key] = promise
  return promise
}

const isTmpId = (id, tmpIdPrefix = TMP_ID_PREFIX) => !id || _.startsWith(id, tmpIdPrefix)
const sortUniqFilter = (ids, tmpIdPrefix) => _.filter(_.sortedUniq(ids.sort()), id => !isTmpId(id, tmpIdPrefix))
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

export function checkFetch(self, query, option) {
  const notForce = !option.force

  prepareFindData(self, query, option)
  if (notForce && option._allIdsHit) return false

  const fetchQuery = withoutTmpId(query, self.idField)
  if (notForce && fetchQuery === false) return false

  const queryString = (self.getQueryString || self.getFetchKey || defaultGetQueryString)(fetchQuery, option)
  if (notForce && queryString === false) return false
  option.queryString = queryString

  if (notForce) {
    const { fetchAts } = self.getState()
    const now = Date.now()
    // collection.fetchMaxAge: 1, // in seconds; null, 0 or -1 means no maxAge
    const { fetchMaxAge } = self
    if (fetchMaxAge > 0 ? fetchAts[queryString] > now - fetchMaxAge : fetchAts[queryString]) {
      return false
    }
    fetchAts[queryString] = now
  }

  // want to return fetching promise for findAsync
  const collection = self
  const { onFetch } = collection
  const p = Promise.resolve(onFetch(fetchQuery, option, collection)).then(res => {
    load(collection, res, option)
    // flush dispatch mutates after load()
    dispatchMutations(collection.store)
  })
  return markPromise(collection, queryString, p)
}
