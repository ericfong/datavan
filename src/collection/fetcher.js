import _ from 'lodash'
// https://github.com/nickyout/fast-stable-stringify/issues/8#issuecomment-329455969
import stringify from 'fast-stable-stringify'

import { getState, addMutation, runHook } from './base'
import { prepareFindData } from './findInMemory'
import { load } from './load'
import { dispatchMutations } from '../store-base'

import { TMP_ID_PREFIX } from '../constant'

// fields for backend DB select columns
// fetchName for backend fetch api name
// fetch object for backend fetch parameters
const serializingFields = ['sort', 'skip', 'limit', 'keyBy', 'fields', 'fetch', 'fetchName', 'inOriginal']

const pickOptionForSerialize = (option, fields = serializingFields) => _.pick(option, fields)

function calcQueryKey(query, option, fields) {
  if (query === false) return false
  if (Array.isArray(query) && query.length === 1) return query[0]
  return stringify([query, pickOptionForSerialize(option, fields)])
}

const isPreloadSkip = (self, option) => !option.serverPreload && self.store && self.store.vanCtx.duringServerPreload

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
        addMutation(self, null) // force render to update isFetching
      }
      return ret
    })
    .catch(err => {
      if (_fetchingPromises[key] === promise) {
        delete _fetchingPromises[key]
        addMutation(self, null) // force render to update isFetching
      }
      return Promise.reject(err)
    })
  _fetchingPromises[key] = promise
  return promise
}

function checkFetch(self, query, option) {
  const notForce = !option.force

  prepareFindData(self, query, option)
  if (notForce && option.allIdsHit) return false

  const { getFetchQuery, getFetchKey } = self
  const fetchQuery = getFetchQuery(query, option, self)
  const fetchKey = (option._fetchKey = getFetchKey(fetchQuery, option))
  if (notForce && fetchKey === false) return false

  if (notForce) {
    const { fetchAts } = getState(self)
    const now = Date.now()
    // console.log('checkFetch', fetchAts[fetchKey] - (now - fetchMaxAge))
    const { fetchMaxAge } = self
    if (fetchMaxAge > 0 ? fetchAts[fetchKey] > now - fetchMaxAge : fetchAts[fetchKey]) return false
    fetchAts[fetchKey] = now
  }

  // want to return fetching promise for findAsync
  const collection = self
  const { onFetch } = collection
  const p = Promise.resolve(onFetch(fetchQuery, option, collection)).then(res => {
    load(collection, res, option)
    // flush dispatch mutates after load()
    dispatchMutations(collection.store)
  })
  return markPromise(collection, fetchKey, p)
}

const isTmpId = (id, tmpIdPrefix = TMP_ID_PREFIX) => !id || _.startsWith(id, tmpIdPrefix)
const sortUniqFilter = (ids, tmpIdPrefix) => _.filter(_.sortedUniq(ids.sort()), id => !isTmpId(id, tmpIdPrefix))
// @auto-fold here
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

const confDefaults = {
  getFetchQuery: (query, option, self) => withoutTmpId(query, self.idField),
  getFetchKey: (fetchQuery, option) => calcQueryKey(fetchQuery, option),
  // fetchMaxAge in seconds; null, 0 or -1 means no maxAge
  // fetchMaxAge: 1,
}

export default base => {
  return {
    ...confDefaults,
    ...base,

    getHook(next, collection, id, option = {}) {
      if (option.fetch !== false && !isPreloadSkip(collection, option)) {
        checkFetch(collection, [id], option)
      }
      return runHook(base.getHook, next, collection, id, option)
    },

    findHook(next, collection, query = {}, option = {}) {
      if (option.fetch !== false && !isPreloadSkip(collection, option)) {
        checkFetch(collection, query, option)
      }
      return runHook(base.findHook, next, collection, query, option)
    },

    // NOTE option.force, returnRaw
    findAsyncHook(next, collection, query = {}, option = {}) {
      return Promise.resolve(checkFetch(collection, query, option)).then(() => {
        // if (option.force && option.returnRaw) return raw
        // _preparedData no longer valid after fetch promise resolved
        delete option._preparedData
        return runHook(base.findAsyncHook, next, collection, query, option)
      })
    },
  }
}
