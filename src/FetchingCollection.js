import _ from 'lodash'

import { isThenable, syncOrThen } from './util/promiseUtil'
import Collection from './Collection'
import { calcFindKey, normalizeQuery } from './util/queryUtil'

export default class FetchingCollection extends Collection {
  // NOTE expecting overriding
  // onFetch() {}
  // calcFetchKey() {}
  isAsyncFetch = false

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
    if (this.onFetch && normalizeQuery(query, this.idField, this.isLocalId)) {
      // NOTE diff behavior for Sync and Async
      const cacheKey = this.calcFetchKey(query, option)
      if (this._shouldReload(cacheKey, option.load)) {
        const result = this._doReload(query, option, cacheKey)

        const { duringMapState } = this._store.getContext()
        // console.log('find duringMapState', !duringMapState, result, super.find(query, option))
        if (!duringMapState && (option.load === 'reload' || option.load === 'load')) {
          // TODO compare local and remote result, drop if backend is removed
          return syncOrThen(result, () => super.find(query, option))
        }
      }
    }
    return super.find(query, option)
  }

  get(id, option = {}) {
    if (this.onFetch) {
      // NOTE diff behavior for Sync and Async
      if (this.isAsyncFetch) {
        if (id && !this.isLocalId(id) && this._shouldReload(id, option.load)) {
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
    let findingKey = cacheKey
    if (this.isAsyncFetch) {
      // is loading (promise exists but not deleted)
      if (findingKey === undefined) findingKey = this.calcFetchKey(query, option)
      const oldPromise = this._fetchPromises[findingKey]
      if (oldPromise) {
        console.warn('try to fetch same ajax query while old ajax call is running')
        return oldPromise
      }
    }

    // NOTE should be able to handle Both Async and Sync onFetch
    const result = this.onFetch(query, option)

    const fetchIsAsync = (this.isAsyncFetch = isThenable(result))
    if (fetchIsAsync) {
      // uniq promise
      if (findingKey === undefined) findingKey = this.calcFetchKey(query, option)
      const now = new Date()
      // means start to fetch
      this._fetchTimes[findingKey] = now
      // prevent fetch by ids again for some ids
      _.each(this._getQueryIds(query), id => (this._fetchTimes[id] = now))

      // may not need promise anymore
      const promiseTable = this._fetchPromises
      promiseTable[findingKey] = result
      result
        .then(ret => {
          delete promiseTable[findingKey]

          if (_.isEmpty(ret)) {
            // force state change to ensure component known loading is done, but just load nothing
            this._store.dispatchNow()
          } else {
            const changes = this.importAll(ret)
            // skip setAll overriding
            this._setAll(changes)
            // store fetchTimes
            if (changes) {
              _.keys(changes).forEach(id => {
                this._fetchTimes[id] = now
              })
            }
          }

          // TODO compare local and remote result, drop if backend is removed
          // should return the processed ret array instead?
          return ret
        })
        .catch(err => {
          delete promiseTable[findingKey]
          if (__DEV__) console.error(err)
          return Promise.reject(err)
        })
    } else {
      // Async fetch result
      // skip setAll
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
    return changes
  }

  isTidy() {
    return true
  }

  getPromise() {
    const promises = _.values(this._fetchPromises)
    if (this._fetchByIdsPromise) promises.push(this._fetchByIdsPromise)
    const superPromise = super.getPromise && super.getPromise()
    if (superPromise) promises.push(superPromise)
    // console.log('getPromise()', _.values(this._fetchPromises), this._fetchByIdsPromise, superPromise)
    return promises.length > 0 ? Promise.all(promises) : null
  }

  isFetching() {
    return !!this._fetchByIdsPromise || Object.keys(this._fetchPromises).length > 0
  }

  invalidate() {
    if (super.invalidate) super.invalidate()
    this._fetchTimes = {}
    // NOTE Fetcher should combine with Stage, so no local changes will go to Fetcher wrapping collection
  }
}
