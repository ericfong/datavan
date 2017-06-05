import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { isThenable, syncOrThen } from './util/promiseUtil'
import Collection from './Collection'
import { normalizeQuery, calcFindKey } from './util/queryUtil'

export default class FetchingCollection extends Collection {
  // Override: onFetch()
  _cacheAts = {}

  constructor(state) {
    super(state)
    state.requests = state.requests || {}

    const now = new Date()
    const _cacheAts = this._cacheAts
    const setCacheAtFunc = (v, cacheKey) => {
      _cacheAts[cacheKey] = now
    }
    _.each(state.byId, setCacheAtFunc)
    _.each(state.requests, setCacheAtFunc)
  }

  find(query, option = {}) {
    const ret = super.find(query, option)
    this._checkFetch(query, option) // super.find will set option.cacheKey
    return ret
  }

  get(id) {
    this._checkFetch([id], { cacheKey: id })
    return super.get(id)
  }

  request(req, option = {}) {
    const cacheKey = (option.cacheKey = stringify(req))
    this._checkFetch({ $request: req }, option)
    return this.state.requests[cacheKey]
  }

  _checkFetch(query, option) {
    if (!this.onFetch) return false
    // TODO make sure only background-reload in mapState is good
    const { duringMapState, duringServerPreload, serverPreloading } = this.context
    if (!duringMapState) return false
    // duringServerPreload, only load resource that is mark as preload and preload only one time
    if (duringServerPreload && !serverPreloading) return false

    // have readAt?
    const _cacheAts = this._cacheAts
    const cacheKey = option.cacheKey
    if (_cacheAts[cacheKey]) return false
    _cacheAts[cacheKey] = new Date() // prevent async fetch again

    // fetch
    const result = this.fetch(query, option)
    // expect onFetch call importAll internally
    if (isThenable(result)) {
      const fetchPromises = this._fetchPromises
      fetchPromises[cacheKey] = result
      result
        .then(ret => {
          if (fetchPromises[cacheKey] === result) delete fetchPromises[cacheKey]
          return ret
        })
        .catch(err => {
          if (fetchPromises[cacheKey] === result) delete fetchPromises[cacheKey]
          return Promise.reject(err)
        })
    }
  }

  fetch(query, option) {
    return syncOrThen(this.onFetch(query, option), ret => (this.state.requests[option.cacheKey] = ret))
  }

  _fetchPromises = {}

  findAsync(_query, option = {}) {
    const query = normalizeQuery(_query, this.idField)
    option.queryNormalized = true
    if (query) {
      const cacheKey = (option.cacheKey = calcFindKey(query, option))
      if (!this._cacheAts[cacheKey]) {
        const result = this.fetch(query, option)
        return syncOrThen(result, () => super.find(query, option))
      }
    }
    return Promise.resolve(super.find(query, option))
  }

  requestAsync(req, option = {}) {
    const cacheKey = (option.cacheKey = stringify(req))
    if (!this._cacheAts[cacheKey]) {
      return this.fetch({ $request: req }, option)
    }
    return Promise.resolve(this.state.requests[cacheKey])
  }

  invalidate(key) {
    if (key) {
      delete this._cacheAts[key]
    } else {
      this._cacheAts = {}
    }
  }

  // NOTE for better utilize browser cache, collections should do their own http GET. So, cross collection importAll should be limited
  importAll(_byId, requests) {
    const byId = {}
    const now = new Date()
    const _cacheAts = this._cacheAts
    _.each(_byId, (value, key) => {
      if (key === '$unset') {
        byId.$unset = value
        return
      }

      if (this.isTidy(key)) {
        byId[key] = this.cast(value)
        _cacheAts[key] = now
      }
    })

    // TODO GC more to drop backend removals
    this.gc()

    this.mutateState({ byId, requests })
    this.onChangeDebounce()
  }

  isTidy() {
    return true
  }

  gcTime = 60 * 1000
  _gcAt = 0
  gc() {
    const expire = Date.now() - this.gcTime
    if (this._gcAt > expire) return
    this._gcAt = Date.now()

    const state = this.state
    const _cacheAts = this._cacheAts
    const check = (v, key) => {
      const cacheAt = _cacheAts[key]
      return cacheAt && cacheAt > expire
    }
    state.byId = _.pickBy(state.byId, check)
    state.requests = _.pickBy(state.requests, check)
  }

  getPromise() {
    const promises = _.values(this._fetchPromises)
    const superPromise = super.getPromise && super.getPromise()
    if (superPromise) promises.push(superPromise)
    return promises.length > 0 ? Promise.all(promises) : null
  }

  isFetching() {
    return Object.keys(this._fetchPromises).length > 0
  }
}
