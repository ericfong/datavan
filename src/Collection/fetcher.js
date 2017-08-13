import _ from 'lodash'

import asyncResponse from './asyncResponse'
import { prepareFindData } from './finder'
import { findMemory } from './memory'

const hasFetchAt = (self, fetchKey) => self._fetchAts[fetchKey]
const markFetchAt = (self, fetchKey) => {
  self._fetchAts[fetchKey] = 1
}

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

function checkOption(self, { fetch, serverPreload }) {
  if (fetch === false) return false
  if (self.dv && self.dv.duringServerPreload && !serverPreload) return false
  return true
}

function tryGetFetchQueryKey(self, query, option) {
  // ensure run prepareFindData to determine some data is missing or not
  prepareFindData(self, query, option)
  // shouldFetch if (not-all-ids-hit || key-no-query-cache) && key-not-fetching
  // TODO || key-expired
  // console.log('tryGetFetchQueryKey: option.missIds=', option.missIds, ' option.missQuery=', option.missQuery, self.getState())
  if (!option.missIds && !option.missQuery) return DONT_FETCH

  const fetchQuery = self.getFetchQuery(query, option)
  const fetchKey = self.getFetchKey(fetchQuery, option)
  // console.log('tryGetFetchQueryKey: fetchKey=', fetchKey)
  if (fetchKey === false) return DONT_FETCH

  // console.log('tryGetFetchQueryKey hasFetchAt', !!hasFetchAt(self, fetchKey), fetchKey)

  if (option.missQuery) {
    if (hasFetchAt(self, fetchKey)) return DONT_FETCH
    markFetchAt(self, fetchKey)
  }

  // console.log('tryGetFetchQueryKey _fetchingPromises', !!self._fetchingPromises[fetchKey], fetchKey)
  if (self._fetchingPromises[fetchKey]) return DONT_FETCH
  return { fetchQuery, fetchKey }
}

function _fetch(self, query, option, fetchKey) {
  return self.onFetch(query, option, self).then(res => asyncResponse(self, res, fetchKey))
  // .catch(err => handleError to switch off isFetching)
}

export default {
  find(query = {}, option = {}) {
    if (this.onFetch) {
      if (checkOption(this, option)) {
        const { fetchQuery, fetchKey } = tryGetFetchQueryKey(this, query, option)
        if (fetchKey !== false) {
          const p = _fetch(this, fetchQuery, option, fetchKey)
          addFetchingPromise(this._fetchingPromises, fetchKey, p)
        }
      }
    }
    return findMemory(this, query, option)
  },

  findAsync(query = {}, option = {}) {
    const { fetchQuery, fetchKey } = tryGetFetchQueryKey(this, query, option)
    if (fetchKey !== false) {
      option.preparedData = null
      return _fetch(this, fetchQuery, option, fetchKey).then(() => findMemory(this, query, option))
    }
    return Promise.resolve(findMemory(this, query, option))
  },

  getAsync(id, option = {}) {
    return this.findAsync([id], option).then(_.first)
  },

  get(id, option = {}) {
    if (this.onFetch) {
      if (!id) return undefined
      if (checkOption(this, option)) {
        const query = [id]
        // batch when option.missIds and use getIdFetchKey?
        const { fetchQuery, fetchKey } = tryGetFetchQueryKey(this, query, option)
        if (fetchKey !== false) {
          const p = _fetch(this, fetchQuery, option, fetchKey)
          addFetchingPromise(this._fetchingPromises, fetchKey, p)
        }
      }
    }
    return this.onGet(id, option)
  },

  findOne(query, option) {
    return this.find(query, { ...option, limit: 1 })[0]
  },

  allPendings() {
    return Object.values(this._fetchingPromises)
  },
}
