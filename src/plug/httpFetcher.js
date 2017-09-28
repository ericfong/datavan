import _ from 'lodash'

import { withoutTmpId } from '../collection/util/idUtil'
import calcQueryKey from '../collection/util/calcQueryKey'
import { getState } from '../collection/base'
import { GC_GENERATION } from '../collection/invalidate'
import { prepareFindData } from '../collection/findInState'
import { isPreloadSkip, wrapFetchPromise, doFetch } from './relayFetcher'

function checkFetch(self, query, option, fetcher) {
  prepareFindData(self, query, option)
  if (option.allIdsHit) return false

  const fetchQuery = self.getFetchQuery(query, option, self)
  const fetchKey = (option.fetchKey = self.getFetchKey(fetchQuery, option))
  if (fetchKey === false) return false

  const fetchAts = getState(self).fetchAts
  // console.log('checkFetch', fetchKey, fetchAts[fetchKey], fetchAts)
  if (fetchAts[fetchKey]) return false
  getState(self).fetchAts[fetchKey] = GC_GENERATION

  // want to return fetching promise for findAsync
  return wrapFetchPromise(self, fetchQuery, option, 'fetchKey', fetcher)
}

const confDefaults = {
  getFetchQuery: (query, option, self) => withoutTmpId(query, self.idField),
  getFetchKey: (fetchQuery, option) => calcQueryKey(fetchQuery, option),
}

export default function httpFetcher(conf) {
  conf = _.defaults(conf, confDefaults)
  const fetcher = conf.onFetch

  return base => ({
    ...base,

    find(query = {}, option = {}) {
      _.defaults(option, conf)
      if (option.fetch !== false && !isPreloadSkip(this, option)) {
        checkFetch(this, query, option, fetcher)
      }
      return base.find.call(this, query, option)
    },

    get(id, option = {}) {
      _.defaults(option, conf)
      if (option.fetch !== false && !isPreloadSkip(this, option)) {
        checkFetch(this, [id], option, fetcher)
      }
      return base.get.call(this, id, option)
    },

    findAsync(query = {}, option = {}) {
      _.defaults(option, conf)
      return doFetch(this, query, option, fetcher).then(() => {
        // preparedData no longer valid after fetch promise resolved
        delete option.preparedData
        return base.find.call(this, query, option)
      })
    },
  })
}
