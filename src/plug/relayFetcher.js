// import _ from 'lodash'

import { addMutation } from '../collection/base'
import { load } from '../collection/load'

export const isPreloadSkip = (self, option) => !option.serverPreload && self.store && self.store.vanCtx.duringServerPreload

export function doFetch(self, query, option, fetcher) {
  return Promise.resolve(self.onFetch(query, option, self)).then(res => load(self, res, option))
}

// @auto-fold here
export function wrapFetchPromise(self, query, option, optionField, fetcher) {
  const { _fetchingPromises } = self
  const key = option[optionField]
  const oldPromise = _fetchingPromises[key]
  if (oldPromise) return oldPromise

  const promise = doFetch(self, query, option, fetcher)
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

function checkFetch(self, query, option, fetcher) {
  if (isPreloadSkip(this, option) || option.queryHit || option.allIdsHit) return false

  return wrapFetchPromise(self, query, option, 'queryKey', fetcher)
}

export default function relayFetcher(fetcher) {
  return base => ({
    ...base,

    get(id, option = {}) {
      const ret = base.get.call(this, id, option)
      if (this._byIdAts[id]) {
        option.allIdsHit = true
      }
      checkFetch(this, [id], option, fetcher)
      return ret
    },

    find(query = {}, option = {}) {
      const ret = base.find.call(this, query, option)
      checkFetch(this, query, option, fetcher)
      return ret
    },

    findAsync(query = {}, option = {}) {
      return doFetch(this, query, option, fetcher).then(() => base.find.call(this, query, option))
    },
  })
}
