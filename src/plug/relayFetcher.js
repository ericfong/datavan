// import _ from 'lodash'

import { addMutation } from '../collection/base'
import { load } from '../collection/load'
import { pickOptionForSerialize } from '../collection/util/calcQueryKey'

export const isPreloadSkip = (self, option) => !option.serverPreload && self.store && self.store.vanCtx.duringServerPreload

// @auto-fold here
export function wrapFetchPromise(self, query, option, optionField, doFetch) {
  const { _fetchingPromises } = self
  const key = option[optionField]
  const oldPromise = _fetchingPromises[key]
  if (oldPromise) return oldPromise

  const promise = doFetch(self, query, option)
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

function checkFetch(self, query, option, doFetch) {
  if (isPreloadSkip(self, option) || option.queryHit || option.allIdsHit) return false

  return wrapFetchPromise(self, query, option, 'queryKey', doFetch)
}

const toRelay = (self, query, option) => ({ name: self.name, action: 'findAsync', query, option: pickOptionForSerialize(option) })

export default function relayFetcher(onFetch) {
  function doFetch(self, query, option) {
    return Promise.resolve(onFetch(toRelay(self, query, option), option, self)).then(res => load(self, res, option))
  }

  return base => ({
    ...base,

    get(id, option = {}) {
      const ret = base.get.call(this, id, option)
      if (this._byIdAts[id]) {
        option.allIdsHit = true
      }
      checkFetch(this, [id], option, doFetch)
      return ret
    },

    find(query = {}, option = {}) {
      const ret = base.find.call(this, query, option)
      // checkFetch depend on queryHit & allIdsHit, so need to run AFTER base.find
      checkFetch(this, query, option, doFetch)
      return ret
    },

    findAsync(query = {}, option = {}) {
      return doFetch(this, query, option, doFetch).then(() => base.find.call(this, query, option))
    },
  })
}
