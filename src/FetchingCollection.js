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
    if (this.onFetch) {
      const fetchQuery = normalizeQuery(query, this.idField, this.isLocalId)
      if (fetchQuery) {
        if (this.isAsyncFetch) {
          // NOTE diff behavior for Sync and Async
          const cacheKey = this.calcFetchKey(fetchQuery, option)
          // TODO make sure only background-reload in mapState is good
          // this._store.getContext().duringMapState &&
          if (this._shouldReload(cacheKey, option.load)) {
            const promise = this._doReload(fetchQuery, option, cacheKey)

            if (option.load === 'reload' || option.load === 'load') {
              if (__DEV__) console.error(`Deprecated. Please use Collection.load() or reload() instead of find(query, {option: ${option.load}})`)
              return syncOrThen(promise, () => super.find(query, option))
            }
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
      console.warn(`Deprecated. Please use Collection.load() or reload() or get directly instead of find(query, {option: ${option.load}})`)
    }
    if (this.onFetch && id && !this.isLocalId(id)) {
      // NOTE diff behavior for Sync and Async
      if (this.isAsyncFetch) {
        // TODO make sure only background-reload in mapState is good
        if (this._store.getContext().duringMapState && this._shouldReload(id, option.load)) {
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
    if (mode === 'local') return false
    const fetchTime = this._fetchTimes[cacheKey]

    // console.log('this._store.getContext().duringServerPreload', this._store.getContext().duringServerPreload, mode === 'preload' && !fetchTime)
    if (this._store.getContext().duringServerPreload) {
      // duringServerPreload, only load resource that is mark as preload and preload only one time
      return mode === 'preload' && !fetchTime
    }

    // TODO CronJob to clear _fetchTimes & cached values
    return mode === 'reload' || !fetchTime
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

          if (_.isEmpty(ret)) {
            // force state change to ensure component known loading is done, but just load nothing
            this._store.dispatchNow()
          } else {
            // TODO what about ret is not collection of items, onFetch should call importAll directly?
            const changes = this.importAll(ret)
            // skip setAll overriding
            this._setAll(changes)
            // store fetchTimes again for query return more docs that cannot extract via _getQueryIds
            _.keys(changes).forEach(id => (this._fetchTimes[id] = now))
          }
          return ret
        })
        .catch(err => {
          delete fetchPromises[findingKey]
          if (__DEV__) console.error(err)
          return Promise.reject(err)
        })
    } else {
      // Sync onFetch result (skip setAll which overrided by SubmittingCollection)
      this._setAll(this.importAll(result))
    }
    return result
  }

  importAll(values) {
    const changes = _.reduce(
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
    // GC here
    // TODO compare local and remote result, drop if backend is removed
    return changes
  }

  isTidy() {
    return true
  }

  reload(query, option) {
    const fetchQuery = normalizeQuery(query, this.idField, this.isLocalId)
    const result = this._doReload(fetchQuery, option)
    return syncOrThen(result, () => super.find(query, option))
  }

  load(query, option = {}) {
    const fetchQuery = normalizeQuery(query, this.idField, this.isLocalId)
    const cacheKey = this.calcFetchKey(fetchQuery, option)
    if (!this._fetchTimes[cacheKey]) {
      const result = this._doReload(fetchQuery, option, cacheKey)
      return syncOrThen(result, () => super.find(query, option))
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
