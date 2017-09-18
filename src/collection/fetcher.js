import _ from 'lodash'

import { addMutation } from './base'
import { load } from './load'
import memoizedFind from './memoizedFind'
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

const DONT_FETCH = { fetchKey: false }

function checkOption(self, { fetch, serverPreload }) {
  if (fetch === false) return false
  if (self.store && self.store.vanCtx.duringServerPreload && !serverPreload) return false
  return true
}

function checkFind(self, query, option) {
  // NOTE support invalidate without flashing UI. So, cannot use "if (!option.missIds && !option.missQuery) return DONT_FETCH"

  const fetchQuery = (option.fetchQuery = self.getFetchQuery(query, option))
  const fetchKey = (option.fetchKey = self.getFetchKey(fetchQuery, option))
  // console.log('checkFind: fetchKey=', fetchKey)
  if (fetchKey === false) return DONT_FETCH

  // console.log('checkFind hasFetchAt', !!hasFetchAt(self, fetchKey), fetchKey)

  const { _findAts } = self
  if (_findAts[fetchKey]) return DONT_FETCH
  _findAts[fetchKey] = Date.now()

  // console.log('checkFind _fetchingPromises', !!self._fetchingPromises[fetchKey], fetchKey)
  if (self._fetchingPromises[fetchKey]) return DONT_FETCH
  return { fetchQuery, fetchKey }
}

function checkGet(self, id, option) {
  if (isTmpId(id)) return DONT_FETCH
  const fetchQuery = (option.fetchQuery = [id])
  const fetchKey = (option.fetchKey = self.getFetchKey(fetchQuery, option))

  const { _getAts } = self
  if (_getAts[fetchKey]) return DONT_FETCH
  _getAts[fetchKey] = Date.now()

  if (self._fetchingPromises[fetchKey]) return DONT_FETCH
  return { fetchQuery, fetchKey }
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

export function find(core, query = {}, option = {}) {
  if (core.onFetch) {
    if (checkOption(core, option)) {
      const { fetchQuery, fetchKey } = checkFind(core, query, option)
      if (fetchKey !== false) {
        const p = _fetch(core, fetchQuery, option)
        addFetchingPromise(core._fetchingPromises, fetchKey, p)
      }
    }
  }
  return memoizedFind(core, query, option)
}

export function findAsync(core, query = {}, option = {}) {
  const { fetchQuery, fetchKey } = checkFind(core, query, option)
  if (fetchKey !== false) {
    option.preparedData = null
    return _fetch(core, fetchQuery, option).then(() => memoizedFind(core, query, option))
  }
  return Promise.resolve(memoizedFind(core, query, option))
}

export function getAsync(core, id, option = {}) {
  return findAsync(core, [id], option).then(_.first)
}

export function get(self, id, option = {}) {
  if (self.onFetch) {
    if (!id) return undefined
    if (checkOption(self, option)) {
      const { fetchQuery, fetchKey } = checkGet(self, id, option)
      if (fetchKey !== false) {
        const p = _fetch(self, fetchQuery, option)
        addFetchingPromise(self._fetchingPromises, fetchKey, p)
      }
    }
  }
  return self.onGet(id, option)
}

export function findOne(core, query, option) {
  return find(core, query, { ...option, limit: 1 })[0]
}

export function allPendings(core) {
  return Object.values(core._fetchingPromises)
}
