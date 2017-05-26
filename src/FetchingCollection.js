import _ from 'lodash'

import { isThenable, syncOrThen } from './util/promiseUtil'
import Collection from './Collection'
import { calcFindKey, normalizeQuery } from './util/queryUtil'

export default class FetchingCollection extends Collection {
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

  _getQueryIds(query) {
    if (!query) return null
    const matcher = query[this.idField]
    if (!matcher) return null
    return Array.isArray(matcher.$in) ? matcher.$in : [matcher]
  }

  find(query, option = {}) {
    if (__DEV__ && (option.load === 'local' || option.load === 'load' || option.load === 'reload')) {
      console.error(`Deprecated. Please use Collection.load() or reload() or get directly instead of find(query, {option: ${option.load}})`)
    }
    if (this.onFetch) {
      const fetchQuery = normalizeQuery(query, this.idField, this.isLocalId)
      if (fetchQuery) {
        if (this.isAsyncFetch) {
          // NOTE diff behavior for Sync and Async
          const cacheKey = this.calcFetchKey(fetchQuery, option)
          // TODO make sure only background-reload in mapState is good
          if (this.context.duringMapState && this._shouldReload(cacheKey, option.load)) {
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
    if (__DEV__ && (option.load === 'local' || option.load === 'load' || option.load === 'reload')) {
      console.error(`Deprecated. Please use Collection.load() or reload() or get directly instead of find(query, {option: ${option.load}})`)
    }
    if (this.onFetch && id && !this.isLocalId(id)) {
      // NOTE diff behavior for Sync and Async
      if (this.isAsyncFetch) {
        // TODO make sure only background-reload in mapState is good
        if (this.context.duringMapState && this._shouldReload(id, option.load)) {
          // Async (batch ids in here)
          this._fetchIdTable[id] = 1
          this._fetchByIdsDebounce()
        }
      } else {
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
          return this._doReload(ids)
        }
      })
      .then(() => (this._fetchByIdsPromise = null))
      .catch(() => (this._fetchByIdsPromise = null))
  }

  _shouldReload(cacheKey, mode) {
    const fetchTime = this._fetchTimes[cacheKey]
    if (this.context.duringServerPreload) {
      // duringServerPreload, only load resource that is mark as preload and preload only one time
      return mode === 'preload' && !fetchTime
    }
    return !fetchTime
  }

  _doReload(query, option, cacheKey) {
    // NOTE should be able to handle Both Async and Sync onFetch
    const result = this.onFetch(query, option)
    this.isAsyncFetch = isThenable(result)
    if (this.isAsyncFetch) {
      const findingKey = cacheKey || this.calcFetchKey(query, option)
      const now = new Date()
      this._fetchTimes[findingKey] = now
      // prevent fetch by ids again for same ids, so need to store _fetchTimes before async call done
      _.each(this._getQueryIds(query), id => (this._fetchTimes[id] = now))

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
      // set fetchTimes one-more for onFetch return more docs that cannot extract via _getQueryIds
      // also prevent GC
      const now = new Date()
      _.keys(change).forEach(id => (this._fetchTimes[id] = now))
    }

    // TODO compare local and remote result, drop if backend is removed
    // TODO CronJob to clear _fetchTimes & cached values

    // skip setAll SubmittingCollection overriding

    this._setAll({ byId: change })
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