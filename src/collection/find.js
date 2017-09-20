import _ from 'lodash'

import { addMutation } from './base'
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

function checkOption(self, { fetch, serverPreload }) {
  if (fetch === false) return false
  if (self.store && self.store.vanCtx.duringServerPreload && !serverPreload) return false
  return true
}

function _fetch(self, query, option) {
  return Promise.resolve(self.onFetch(query, option, self))
    .then(res => {
      // force to set requests[fetchKey] to null
      option.mutation = { requests: { [option.fetchKey]: { $set: null } } }
      load(self, res, option)
      addMutation(self, null) // force render to update isFetching
      return res
    })
    .catch(() => {
      addMutation(self, null) // force render to update isFetching
    })
}

function markAts(self, atKey, key) {
  const ats = self[atKey]
  if (ats[key]) return false
  ats[key] = Date.now()
}

// ======================================================================================
// find
// ======================================================================================

function checkFind(self, query, option) {
  // NOTE support invalidate without flashing UI. So, cannot use "if (!option.missIds && !option.missQuery) return DONT_FETCH"

  const fetchQuery = (option.fetchQuery = self.getFetchQuery(query, option))
  const fetchKey = (option.fetchKey = self.getFetchKey(fetchQuery, option))
  // console.log('checkFind: fetchKey=', fetchKey)
  if (fetchKey === false) return false

  if (markAts(self, '_findAts', fetchKey) === false) return false

  if (self._fetchingPromises[fetchKey]) return false
  return fetchQuery
}

export function find(core, query = {}, option = {}) {
  if (core.onFetch) {
    if (checkOption(core, option)) {
      const fetchQuery = checkFind(core, query, option)
      if (fetchQuery !== false) {
        const p = _fetch(core, fetchQuery, option)
        addFetchingPromise(core._fetchingPromises, option.fetchKey, p)
      }
    }
  }
  return findInMemory(core, query, option)
}

export function findAsync(core, query = {}, option = {}) {
  const fetchQuery = checkFind(core, query, option)
  if (fetchQuery !== false) {
    option.preparedData = null
    return _fetch(core, fetchQuery, option).then(() => findInMemory(core, query, option))
  }
  return Promise.resolve(findInMemory(core, query, option))
}

// ======================================================================================
// get
// ======================================================================================

function checkGet(self, id, option) {
  if (isTmpId(id)) return false
  const fetchQuery = (option.fetchQuery = [id])
  const fetchKey = (option.fetchKey = self.getFetchKey(fetchQuery, option))

  if (markAts(self, '_getAts', fetchKey) === false) return false

  if (self._fetchingPromises[fetchKey]) return false
  return fetchQuery
}

export function get(self, id, option = {}) {
  if (self.onFetch) {
    if (!id) return undefined
    if (checkOption(self, option)) {
      const fetchQuery = checkGet(self, id, option)
      if (fetchQuery !== false) {
        const p = _fetch(self, fetchQuery, option)
        addFetchingPromise(self._fetchingPromises, option.fetchKey, p)
      }
    }
  }
  return self.onGet(id, option)
}

export function getAsync(core, id, option = {}) {
  return findAsync(core, [id], option).then(_.first)
}

// ======================================================================================
// extra
// ======================================================================================

export function findOne(core, query, option) {
  return find(core, query, { ...option, limit: 1 })[0]
}

export function allPendings(core) {
  return Object.values(core._fetchingPromises)
}
