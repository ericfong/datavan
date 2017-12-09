// import _ from 'lodash'

import { withoutTmpId } from '../collection/util/idUtil'
import calcQueryKey from '../collection/util/calcQueryKey'
import { getState, addMutation } from '../collection/base'
import { prepareFindData } from '../collection/findInState'
import { load } from '../collection/load'
import runHook from '../collection/util/runHook'

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

function checkFetch(self, query, option, { getFetchQuery, getFetchKey, doFetch }) {
  const notForce = !option.force

  prepareFindData(self, query, option)
  if (option.allIdsHit && notForce) return Promise.resolve(false)

  const fetchQuery = getFetchQuery(query, option, self)
  const fetchKey = (option._fetchKey = getFetchKey(fetchQuery, option))
  if (fetchKey === false && notForce) return Promise.resolve(false)

  const { fetchAts } = getState(self)
  // console.log('checkFetch', fetchKey, fetchAts[fetchKey], fetchAts)
  if (fetchAts[fetchKey] && notForce) return Promise.resolve(false)
  fetchAts[fetchKey] = Date.now()

  // want to return fetching promise for findAsync
  return markPromise(self, fetchKey, doFetch(self, fetchQuery, option))
}

const confDefaults = {
  getFetchQuery: (query, option, self) => withoutTmpId(query, self.idField),
  getFetchKey: (fetchQuery, option) => calcQueryKey(fetchQuery, option),
}

export default function httpFetcher(conf) {
  const { onFetch } = conf
  function doFetch(self, query, option) {
    return Promise.resolve(onFetch(query, option, self)).then(res => load(self, res, option))
  }
  conf = {
    ...confDefaults,
    doFetch,
    ...conf,
  }

  return base => ({
    ...base,

    getHook(next, collection, id, option = {}) {
      if (option.fetch !== false && !isPreloadSkip(collection, option)) {
        checkFetch(collection, [id], option, conf)
      }
      return runHook(base.getHook, next, collection, id, option)
    },

    findHook(next, collection, query = {}, option = {}) {
      if (option.fetch !== false && !isPreloadSkip(collection, option)) {
        checkFetch(collection, query, option, conf)
      }
      return runHook(base.findHook, next, collection, query, option)
    },

    // NOTE option.force, returnRaw
    findAsyncHook(next, collection, query = {}, option = {}) {
      return checkFetch(collection, query, option, conf).then(() => {
        // if (option.force && option.returnRaw) return raw
        // _preparedData no longer valid after fetch promise resolved
        delete option._preparedData
        return runHook(base.findAsyncHook, next, collection, query, option)
      })
    },
  })
}
