import _ from 'lodash'

import { withoutTmpId } from '../collection/util/idUtil'
import calcQueryKey from '../collection/util/calcQueryKey'
import { getState } from '../collection/base'
import { GC_GENERATION } from '../collection/invalidate'
import { prepareFindData } from '../collection/findInState'
import { isPreloadSkip, wrapFetchPromise, doFetch } from './relayFetcher'

function checkFetch(self, query, option, isAsync) {
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
  if (isAsync) {
    // preparedData no longer valid after fetch promise resolved
    delete option.preparedData
    return doFetch(self, fetchQuery, option)
  }
  return wrapFetchPromise(self, fetchQuery, option, 'fetchKey')
}

const confDefaults = {
  getFetchQuery: (query, option, self) => withoutTmpId(query, self.idField),
  getFetchKey: (fetchQuery, option) => calcQueryKey(fetchQuery, option),
}

export default function httpFetcher(conf) {
  conf = _.defaults(conf, confDefaults)

  return base => ({
    ...base,

    find(query = {}, option = {}) {
      _.defaults(option, conf)
      if (option.fetch !== false && !isPreloadSkip(this, option)) {
        checkFetch(this, query, option)
      }
      return base.find.call(this, query, option)
    },

    findAsync(query = {}, option = {}) {
      _.defaults(option, conf)
      return Promise.resolve(checkFetch(this, query, option, true)).then(() => base.find.call(this, query, option))
    },

    get(id, option = {}) {
      _.defaults(option, conf)
      if (option.fetch !== false && !isPreloadSkip(this, option)) {
        checkFetch(this, [id], option)
      }
      return base.get.call(this, id, option)
    },
  })
}
