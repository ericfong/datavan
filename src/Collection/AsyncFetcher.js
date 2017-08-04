import _ from 'lodash'
import asyncResponse from './asyncResponse'
import { prepareFindData } from './SyncFinder'

// @auto-fold here
function addFetchingPromise(fetchingPromises, fetchKey, promise) {
  if (promise && promise.then) {
    fetchingPromises[fetchKey] = promise
    promise
      .then(ret => {
        if (fetchingPromises[fetchKey] === promise) delete fetchingPromises[fetchKey]
        return ret
      })
      .catch(err => {
        if (fetchingPromises[fetchKey] === promise) delete fetchingPromises[fetchKey]
        return Promise.reject(err)
      })
  }
  return promise
}

const DONT_FETCH = { fetchKey: false }

export default function (self) {
  const { findMemory, hasFetchAt, markFetchAt } = self

  const fetchingPromises = {}

  // init
  // _.each(pendingState.byId, setTimeFunc)
  _.keys(self.getState().requests).forEach(markFetchAt)

  function checkOption({ fetch, serverPreload }) {
    if (fetch === false) return false
    if (self.dv && self.dv.duringServerPreload && !serverPreload) return false
    return true
  }

  function tryGetFetchQueryKey(query, option) {
    // ensure run prepareFindData to determine some data is missing or not
    prepareFindData(self, query, option)
    // shouldFetch if (not-all-ids-hit || key-no-query-cache) && key-not-fetching
    // TODO || key-expired
    if (!option.missIds && !option.missQuery) return DONT_FETCH

    const fetchQuery = self.getFetchQuery(query, option)
    const fetchKey = self.getFetchKey(fetchQuery, option)
    if (fetchKey === false) return DONT_FETCH

    // console.log('tryGetFetchQueryKey', option.missIds, option.missQuery, fetchKey, fetchAts[fetchKey], query)

    if (option.missQuery) {
      if (hasFetchAt(fetchKey)) return DONT_FETCH
      markFetchAt(fetchKey)
    }

    // console.log('fetchingPromises[fetchKey]', fetchingPromises[fetchKey], fetchKey)
    if (fetchingPromises[fetchKey]) return DONT_FETCH
    return { fetchQuery, fetchKey }
  }

  function _fetch(query, option, fetchKey) {
    return self.onFetch(self, query, option).then(res => asyncResponse(self, res, fetchKey))
    // .catch(err => handleError to switch off isFetching)
  }

  function findAsync(query = {}, option = {}) {
    const { fetchQuery, fetchKey } = tryGetFetchQueryKey(query, option)
    if (fetchKey !== false) {
      option.preparedData = null
      return _fetch(fetchQuery, option, fetchKey).then(() => findMemory(query, option))
    }
    return findMemory(query, option)
  }

  function find(query, option) {
    if (checkOption(option)) {
      const { fetchQuery, fetchKey } = tryGetFetchQueryKey(query, option)
      if (fetchKey !== false) {
        const p = _fetch(fetchQuery, option, fetchKey)
        addFetchingPromise(fetchingPromises, fetchKey, p)
      }
    }
    return findMemory(query, option)
  }

  function get(id, option) {
    if (!id) return undefined
    if (checkOption(option)) {
      const query = [id]
      // batch when option.missIds and use getIdFetchKey?
      const { fetchQuery, fetchKey } = tryGetFetchQueryKey(query, option)
      if (fetchKey !== false) {
        const p = _fetch(fetchQuery, option, fetchKey)
        addFetchingPromise(fetchingPromises, fetchKey, p)
      }
    }
    return self.getDataById(id, option)
  }

  Object.assign(self, {
    find,
    findAsync,
    get,

    allPendings() {
      return Object.values(fetchingPromises)
    },
  })
}
