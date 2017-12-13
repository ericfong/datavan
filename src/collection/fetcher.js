// import _ from 'lodash'

import { withoutTmpId } from './util/idUtil'
import calcQueryKey from './util/calcQueryKey'
import { getState, addMutation } from './base'
import { prepareFindData } from './findInState'
import { load } from './load'
import runHook from './util/runHook'
import { dispatchMutations } from '../store-base'

export const isPreloadSkip = (self, option) => !option.serverPreload && self.store && self.store.vanCtx.duringServerPreload

// @auto-fold here
export function markPromise(self, key, promise, overwrite) {
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
