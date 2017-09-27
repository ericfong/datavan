import { withoutTmpId } from '../collection/util/idUtil'
import { calcFetchKey } from '../collection/util/keyUtil'
import { getState, addMutation } from '../collection/base'
import { GC_GENERATION } from '../collection/invalidate'
import { load } from '../collection/load'
import { prepareFindData } from '../collection/findInState'

// @auto-fold here
function checkInMapState(self, { fetch, serverPreload }) {
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

function checkFetch(self, query, option, isAsync) {
  if (!isAsync && !checkInMapState(self, option)) return false

  prepareFindData(self, query, option)
  if (option.allIdsHit) return false

  const fetchQuery = self.getFetchQuery(query, option, self)
  const fetchKey = (option.fetchKey = self.getFetchKey(fetchQuery, option))
  if (fetchKey === false) return false

  const fetchAts = getState(self).fetchAts
  // console.log('checkFetch', fetchKey, fetchAts[fetchKey], fetchAts)
  if (fetchAts[fetchKey]) return false
  // fetchAts is set in doFetch

  // want to return fetching promise for findAsync
  if (isAsync) {
    // preparedData no longer valid after fetch promise resolved
    delete option.preparedData
    return doFetch(self, fetchQuery, option)
  }
  return wrapFetchPromise(self, fetchQuery, option)
}

const getFetchQuery = (query, option, self) => withoutTmpId(query, self.idField)
const getFetchKey = (fetchQuery, option) => calcFetchKey(fetchQuery, option)

export const httpFetchFunctions = {
  getFetchQuery,
  getFetchKey,
  // onFetch(),
  // onSubmit(),
  checkFetch,
}

export default function httpFetcher(conf) {
  return self => ({
    ...self,
    ...httpFetchFunctions,
    ...conf,
  })
}
