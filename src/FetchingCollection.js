import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { isThenable, syncOrThen } from './util/promiseUtil'
import Collection from './Collection'
import { calcFindKey, normalizeQuery } from './util/queryUtil'

export default class FetchingCollection extends Collection {
  // state = { queries: {} }

  // NOTE expecting overriding
  // onFetch() {}
  // calcFetchKey() {}
  isAsyncFetch = false

  // TODO may need to pass _fetchTimes data from server to client
  // fetchTime means start to fetch
  _fetchTimes = {}
  _fetchPromises = {}

  calcFetchKey(query, option) {
    return calcFindKey(query, option)
  }

  find(query, option = {}) {
    if (this.onFetch) {
      const fetchQuery = normalizeQuery(query, this.idField, this.isLocalId)
      if (fetchQuery) {
        if (this.isAsyncFetch) {
          // NOTE diff behavior for Sync and Async
          const cacheKey = this.calcFetchKey(fetchQuery, option)
          // TODO make sure only background-reload in mapState is good
          if (this._shouldReload(cacheKey)) {
            this._doReload(fetchQuery, option, cacheKey)
          }
        } else {
          this._doReload(fetchQuery, option)
        }
      }
    }
    return super.find(query, option)
  }

  get(id, option = {}) {
    if (this.onFetch && id && !this.isLocalId(id)) {
      // NOTE diff behavior for Sync and Async
      if (this.isAsyncFetch) {
        // TODO make sure only background-reload in mapState is good
        if (this._shouldReload(id)) {
          // Async (batch ids in here)
          this._fetchIdTable[id] = 1
          this._fetchByIdsDebounce()
        }
      } else {
        // prevent Async fetch by ids again
        this._doReload([id])
      }
    }
    return super.get(id, option)
  }
  _fetchIdTable = []
  _fetchByIdsPromise = null
  _fetchByIdsDebounce() {
    if (this._fetchByIdsPromise) return this._fetchByIdsPromise

    const promises = _.values(this._fetchPromises)
    this._fetchByIdsPromise = Promise.all(promises)
      .then(() => {
        const ids = Object.keys(this._fetchIdTable)
        if (ids.length > 0) {
          const now = new Date()
          _.each(ids, id => (this._fetchTimes[id] = now))
          return this._doReload(ids)
        }
      })
      .then(() => (this._fetchByIdsPromise = null))
      .catch(() => (this._fetchByIdsPromise = null))
  }

  query(query, option = {}) {
    // like get but for backend oriented data
    const cacheKey = this.calcQueryKey(query)
    if (this.onQuery && this._shouldReload(cacheKey)) {
      this._doReload(query, option, cacheKey, 'onQuery')
    }
    return this.state.queries[cacheKey]
  }
  calcQueryKey(query) {
    return stringify(query)
  }

  _shouldReload(cacheKey) {
    const { duringMapState, duringServerPreload, serverPreloading } = this.context
    if (!duringMapState) return false
    // duringServerPreload, only load resource that is mark as preload and preload only one time
    if (duringServerPreload && !serverPreloading) return false
    return !this._fetchTimes[cacheKey]
  }

  _doReload(query, option, cacheKey, reloadFuncName = 'onFetch') {
    // NOTE should be able to handle Both Async and Sync onFetch
    const result = this[reloadFuncName](query, option)
    this.isAsyncFetch = isThenable(result)
    if (this.isAsyncFetch) {
      const findingKey = cacheKey || this.calcFetchKey(query, option)
      const now = new Date()
      this._fetchTimes[findingKey] = now

      const fetchPromises = this._fetchPromises
      fetchPromises[findingKey] = result
      result
        .then(ret => {
          delete fetchPromises[findingKey]
          // NOTE onFetch may call importAll directly. One ajax call contains few collections data
          this.importAll(ret)
          return ret
        })
        .catch(err => {
          delete fetchPromises[findingKey]
          if (__DEV__) console.error(err)
          return Promise.reject(err)
        })
    } else if (result) {
      // Sync onFetch result
      this.importAll(result)
    }
    return result
  }

  // NOTE for better utilize browser cache, each collection (or one-to-many relationship collection groups) should do their own http GET.
  // Hence, cross collection importAll should be limited
  // add invalidateAll() for backend to notify front-end to clean cache
  importAll(values) {
    const change = _.reduce(
      values,
      (accumulator, value, key) => {
        if (value && this.isTidy(key)) {
          const doc = this.cast(value)
          const id = doc[this.idField] || key
          accumulator[id] = doc
        }
        return accumulator
      },
      {}
    )

    if (this.isAsyncFetch) {
      const now = new Date()
      // set fetchTimes to prevent GC or re-fetch again
      _.keys(change).forEach(id => (this._fetchTimes[id] = now))
    }

    // TODO compare local and remote result, drop if backend is removed
    // TODO CronJob to clear _fetchTimes & cached values

    // skip setAll SubmittingCollection overriding

    this._setAll(change)
  }

  isTidy() {
    return true
  }

  reload(query, option) {
    const fetchQuery = normalizeQuery(query, this.idField, this.isLocalId)
    if (fetchQuery) {
      const result = this._doReload(fetchQuery, option)
      return syncOrThen(result, () => super.find(query, option))
    }
    return Promise.resolve(super.find(query, option))
  }

  load(query, option = {}) {
    const fetchQuery = normalizeQuery(query, this.idField, this.isLocalId)
    if (fetchQuery) {
      const cacheKey = this.calcFetchKey(fetchQuery, option)
      if (!this._fetchTimes[cacheKey]) {
        const result = this._doReload(fetchQuery, option, cacheKey)
        return syncOrThen(result, () => super.find(query, option))
      }
    }
    return Promise.resolve(super.find(query, option))
  }

  getPromise() {
    const promises = _.values(this._fetchPromises)
    if (this._fetchByIdsPromise) promises.push(this._fetchByIdsPromise)
    const superPromise = super.getPromise && super.getPromise()
    if (superPromise) promises.push(superPromise)
    return promises.length > 0 ? Promise.all(promises) : null
  }

  // isFetching state should be stored, so change in isFetching state will cause a dispatch
  isFetching() {
    return !!this._fetchByIdsPromise || Object.keys(this._fetchPromises).length > 0
  }

  invalidate() {
    if (super.invalidate) super.invalidate()
    this._fetchTimes = {}
    // FIXME drop all data that is NOT dirty
  }
}
