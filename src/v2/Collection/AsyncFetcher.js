import _ from 'lodash'
import asyncResponse from './asyncResponse'

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

export default function (collection) {
  const { dv, onFetch, findMemory, prepareFindData, getDataById, getFetchQuery, getFetchKey, getState } = collection

  const fetchAts = {}
  const fetchingPromises = {}

  function markFetchAt(fetchKey) {
    fetchAts[fetchKey] = 1
  }

  // init
  // _.each(pendingState.byId, setTimeFunc)
  _.keys(getState().requests).forEach(markFetchAt)

  function checkOption({ fetch, serverPreload }) {
    if (fetch === false) return false
    if (dv && dv.duringServerPreload && !serverPreload) return false
    return true
  }

  function tryGetFetchQueryKey(query, option) {
    // ensure run prepareFindData to determine some data is missing or not
    prepareFindData(query, option)
    // shouldFetch if (not-all-ids-hit || key-no-query-cache) && key-not-fetching
    // TODO || key-expired
    if (!option.missIds && !option.missQuery) return DONT_FETCH

    const fetchQuery = getFetchQuery(query, option)
    const fetchKey = getFetchKey(fetchQuery, option)
    if (fetchKey === false) return DONT_FETCH

    // console.log('tryGetFetchQueryKey', option.missIds, option.missQuery, fetchKey, fetchAts[fetchKey], query)

    if (option.missQuery) {
      if (fetchAts[fetchKey]) return DONT_FETCH
      markFetchAt(fetchKey)
    }

    // console.log('fetchingPromises[fetchKey]', fetchingPromises[fetchKey], fetchKey)
    if (fetchingPromises[fetchKey]) return DONT_FETCH
    return { fetchQuery, fetchKey }
  }

  function _fetch(query, option, fetchKey) {
    return onFetch(collection, query, option).then(res => asyncResponse(collection, res, fetchKey))
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
    return getDataById(id, option)
  }

  return Object.assign(collection, {
    find,
    findAsync,
    get,

    markFetchAt,

    allPendings() {
      return Object.values(fetchingPromises)
    },
  })
}
