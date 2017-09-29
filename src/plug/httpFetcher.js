import _ from 'lodash'

import { withoutTmpId } from '../collection/util/idUtil'
import calcQueryKey from '../collection/util/calcQueryKey'
import { getState } from '../collection/base'
import { GC_GENERATION } from '../collection/invalidate'
import { prepareFindData } from '../collection/findInState'
import { load } from '../collection/load'
import { isPreloadSkip, wrapFetchPromise } from './relayFetcher'

function checkFetch(self, query, option, { getFetchQuery, getFetchKey, doFetch }) {
  prepareFindData(self, query, option)
  if (option.allIdsHit) return false

  const fetchQuery = getFetchQuery(query, option, self)
  const fetchKey = (option.fetchKey = getFetchKey(fetchQuery, option))
  if (fetchKey === false) return false

  const fetchAts = getState(self).fetchAts
  // console.log('checkFetch', fetchKey, fetchAts[fetchKey], fetchAts)
  if (fetchAts[fetchKey]) return false
  getState(self).fetchAts[fetchKey] = GC_GENERATION

  // want to return fetching promise for findAsync
  return wrapFetchPromise(self, fetchQuery, option, 'fetchKey', doFetch)
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

    find(query = {}, option = {}) {
      if (option.fetch !== false && !isPreloadSkip(this, option)) {
        checkFetch(this, query, option, conf)
      }
      return base.find.call(this, query, option)
    },

    get(id, option = {}) {
      if (option.fetch !== false && !isPreloadSkip(this, option)) {
        checkFetch(this, [id], option, conf)
      }
      return base.get.call(this, id, option)
    },

    findAsync(query = {}, option = {}) {
      return doFetch(this, query, option, conf).then(() => {
        // preparedData no longer valid after fetch promise resolved
        delete option.preparedData
        return base.find.call(this, query, option)
      })
    },
  })
}
