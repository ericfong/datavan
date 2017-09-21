import { getState, addMutation } from './base'
import { load } from './load'
import findInMemory from './findInMemory'
import { isTmpId } from './util/idUtil'

// @auto-fold here
function addFetchingPromise(fetchingPromises, fetchKey, promise) {
  fetchingPromises[fetchKey] = promise
  return promise
    .then(ret => {
      if (fetchingPromises[fetchKey] === promise) delete fetchingPromises[fetchKey]
      return ret
    })
    .catch(err => {
      if (fetchingPromises[fetchKey] === promise) delete fetchingPromises[fetchKey]
      return Promise.reject(err)
    })
}

// @auto-fold here
function checkOption(self, { fetch, serverPreload }) {
  if (!self.onFetch) return false
  if (fetch === false) return false
  if (self.store && self.store.vanCtx.duringServerPreload && !serverPreload) return false
  return true
}

function doFetch(self, query, option) {
  getState(self).fetchAts[option.fetchKey] = 1

  return Promise.resolve(self.onFetch(query, option, self))
    .then(res => {
      load(self, res, option)
      addMutation(self, null) // force render to update isFetching
      return res
    })
    .catch(() => {
      addMutation(self, null) // force render to update isFetching
    })
}

function checkFetch(self, fetchQuery, option) {
  const fetchKey = (option.fetchKey = self.getFetchKey(fetchQuery, option))
  if (fetchKey === false) return false

  const fetchAts = getState(self).fetchAts
  // console.log('checkFetch', fetchKey, fetchAts[fetchKey], fetchAts)
  if (fetchAts[fetchKey]) return false
  // fetchAts is set in doFetch

  // want to return fetching promise for findAsync
  const _fetchingPromises = self._fetchingPromises
  let promise = _fetchingPromises[fetchKey]
  if (!promise) {
    promise = doFetch(self, fetchQuery, option)
    addFetchingPromise(_fetchingPromises, fetchKey, promise)
  }
  return promise
}

// ======================================================================================
// find & get
// ======================================================================================

export function find(self, query = {}, option = {}) {
  if (checkOption(self, option)) {
    checkFetch(self, self.getFetchQuery(query, option), option)
  }
  return findInMemory(self, query, option)
}

export function findAsync(self, query = {}, option = {}) {
  const promise = checkFetch(self, self.getFetchQuery(query, option), option)
  return Promise.resolve(promise).then(() => findInMemory(self, query, option))
}

export function get(self, id, option = {}) {
  if (checkOption(self, option) && !isTmpId(id)) {
    checkFetch(self, [id], option)
  }
  return self.onGet(id, option)
}
