import { getState, addMutation } from './base'
import { GC_GENERATION } from './invalidate'
import { load } from './load'
import { prepareFindData } from './findInState'
import findInMemory from './findInMemory'

// @auto-fold here
function checkInMapState(self, { fetch, serverPreload }) {
  if (!self.onFetch) return false
  if (fetch === false) return false
  if (self.store && self.store.vanCtx.duringServerPreload && !serverPreload) return false
  return true
}

function doFetch(self, query, option) {
  getState(self).fetchAts[option.fetchKey] = GC_GENERATION

  return Promise.resolve(self.onFetch(query, option, self)).then(res => load(self, res, option))
}

// @auto-fold here
function wrapFetchPromise(self, fetchQuery, option) {
  const { _fetchingPromises } = self
  const { fetchKey } = option
  const oldPromise = _fetchingPromises[fetchKey]
  if (oldPromise) return oldPromise

  const promise = doFetch(self, fetchQuery, option)
    .then(ret => {
      if (_fetchingPromises[fetchKey] === promise) {
        delete _fetchingPromises[fetchKey]
        addMutation(self, null) // force render to update isFetching
      }
      return ret
    })
    .catch(err => {
      if (_fetchingPromises[fetchKey] === promise) {
        delete _fetchingPromises[fetchKey]
        addMutation(self, null) // force render to update isFetching
      }
      return Promise.reject(err)
    })
  _fetchingPromises[fetchKey] = promise
  return promise
}

function checkFetch(self, query, option, isDirect) {
  prepareFindData(self, query, option)
  if (option.allIdsHit) return false

  const fetchQuery = self.getFetchQuery(query, option)
  const fetchKey = (option.fetchKey = self.getFetchKey(fetchQuery, option))
  if (fetchKey === false) return false

  const fetchAts = getState(self).fetchAts
  // console.log('checkFetch', fetchKey, fetchAts[fetchKey], fetchAts)
  if (fetchAts[fetchKey]) return false
  // fetchAts is set in doFetch

  // want to return fetching promise for findAsync
  return isDirect ? doFetch(self, fetchQuery, option) : wrapFetchPromise(self, fetchQuery, option)
}

// ======================================================================================
// find & get
// ======================================================================================

export function find(self, query = {}, option = {}) {
  if (checkInMapState(self, option)) checkFetch(self, query, option)
  return findInMemory(self, query, option)
}

export function findAsync(self, query = {}, option = {}) {
  return Promise.resolve(checkFetch(self, query, option, true)).then(() => findInMemory(self, query, option))
}

export function get(self, id, option = {}) {
  if (checkInMapState(self, option)) checkFetch(self, [id], option)
  return self.onGet(id, option)
}
