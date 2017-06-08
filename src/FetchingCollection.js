import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { isThenable, syncOrThen } from './util/promiseUtil'
import Collection from './Collection'
import { normalizeQueryAndKey, calcQueryKey } from './util/queryUtil'

// @auto-fold here
function loopResponse(data, idField, operations) {
  if (!data) return
  const handleById = operations.$byId

  if (Array.isArray(data)) return _.each(data, doc => handleById(doc, doc[idField]))

  _.each(data, (value, key) => {
    if (key[0] === '$') {
      const opFunc = operations[key]
      if (opFunc) {
        opFunc(value)
      } else {
        throw new Error(`Unknown import operation ${key}`)
      }
    } else {
      handleById(value, (value && value[idField]) || key)
    }
  })
}

// @auto-fold here
function excludeLocalId(filter, idField, isLocalId) {
  if (Array.isArray(filter)) {
    const ids = _.filter(filter, id => id && !isLocalId(id))
    if (ids.length === 0) {
      return false
    }
    return ids
  }
  if (filter[idField]) {
    const newQuery = { ...filter }
    const idMatcher = filter[idField]
    if (!idMatcher) {
      return false
    }
    if (typeof idMatcher === 'string' && isLocalId(idMatcher)) {
      return false
    }
    if (idMatcher.$in) {
      const ids = _.filter(idMatcher.$in, id => id && !isLocalId(id))
      if (ids.length === 0) {
        return false
      }
      newQuery[idField].$in = ids
    }
    return newQuery
  }
  return filter
}

// @auto-fold here
function markFetchPromise(fetchPromises, key, promise) {
  if (isThenable(promise)) {
    fetchPromises[key] = promise
    promise
      .then(ret => {
        if (fetchPromises[key] === promise) delete fetchPromises[key]
        return ret
      })
      .catch(err => {
        if (fetchPromises[key] === promise) delete fetchPromises[key]
        return Promise.reject(err)
      })
  }
  return promise
}

function _checkFindAsync(fetchQuery, option, fetchKey) {
  if (fetchKey === false || !this.onFetch) return

  const _fetchAts = this._fetchAts
  if (!this.alwaysFetch && _fetchAts[fetchKey]) return
  _fetchAts[fetchKey] = new Date() // prevent async fetch again

  return this.fetch(fetchQuery, option, fetchKey)
}

function _checkFind(fetchQuery, option, fetchKey) {
  const { duringServerPreload, serverPreloading } = this.context
  if (duringServerPreload && !serverPreloading) return

  const promise = _checkFindAsync.call(this, fetchQuery, option, fetchKey)
  if (promise) {
    return markFetchPromise(this._fetchPromises, fetchKey, promise)
  }
}

function _prepareFind(_filter, option) {
  const filter = normalizeQueryAndKey(_filter, option, this.idField)
  if (filter === false) {
    return { filter, fetchKey: false }
  }
  if (filter.$query) {
    return {
      filter: _.omit(filter, '$query'),
      fetchKey: option.fetch !== undefined ? option.fetch : this.calcFetchKey(filter, option),
      fetchQuery: filter,
      fetchOnly: Object.keys(filter).length === 1,
    }
  }

  const fetchQuery = excludeLocalId(filter, this.idField, this.isLocalId)
  return {
    filter,
    fetchKey: option.fetch !== undefined ? option.fetch : fetchQuery !== false && this.calcFetchKey(fetchQuery, option),
    fetchQuery,
  }
}

export default class FetchingCollection extends Collection {
  // Override: onFetch(), alwaysFetch
  _fetchAts = {}

  constructor(state) {
    super(state)
    state.fetches = state.fetches || {}

    const now = new Date()
    const _fetchAts = this._fetchAts
    const setTimeFunc = (v, key) => (_fetchAts[key] = now)
    _.each(state.byId, setTimeFunc)
    _.each(state.fetches, setTimeFunc)
  }

  calcFetchKey(remoteQuery, option) {
    return remoteQuery.$query ? stringify(remoteQuery.$query) : calcQueryKey(remoteQuery, option)
  }

  get(id, option = {}) {
    _checkFind.call(this, [id], option, id)
    return super.get(id)
  }

  find(_filter, option = {}) {
    const { filter, fetchKey, fetchQuery, fetchOnly } = _prepareFind.call(this, _filter, option)
    _checkFind.call(this, fetchQuery, option, fetchKey)
    return fetchOnly ? this.state.fetches[fetchKey] : this._findNormalized(filter, option)
  }

  findAsync(_filter, option = {}) {
    const { filter, fetchKey, fetchQuery, fetchOnly } = _prepareFind.call(this, _filter, option)
    return Promise.resolve(_checkFindAsync.call(this, fetchQuery, option, fetchKey)).then(
      () => (fetchOnly ? this.state.fetches[fetchKey] : this._findNormalized(filter, option))
    )
  }

  fetch(query, option, fetchKey) {
    return syncOrThen(this.onFetch(query, option), ret => {
      // console.log('fetch result', ret)
      this.importAll(ret, fetchKey)
      return ret
    })
  }

  _fetchPromises = {}

  invalidate(key) {
    if (key) {
      delete this._fetchAts[key]
    } else {
      this._fetchAts = {}
    }
    // NOTE change state object to force connect to think collection have been updated and re-run
    // will also invalidate all find memory cache
    this.state = { ...this.state }
  }

  importAll(ops, fetchKey) {
    const mutation = { byId: {} }
    const byId = mutation.byId
    const _fetchAts = this._fetchAts
    const idField = this.idField
    const now = new Date()
    loopResponse(ops, idField, {
      // handleById
      $byId: (doc, id) => {
        if (this.isDirty(id)) return
        byId[id] = this.cast(doc)
        _fetchAts[id] = now
      },
      $unset(value) {
        byId.$unset = value
      },
      $query(value) {
        mutation.fetches = { [fetchKey]: value }
      },
    })
    // console.log('importAll', mutation)
    this.mutateState(mutation)

    // TODO GC more to drop backend removals
    this.gc()
    this.onChangeDebounce()
  }

  isDirty() {
    return true
  }

  gcTime = 60 * 1000
  _gcAt = 0
  gc() {
    const expire = Date.now() - this.gcTime
    if (this._gcAt > expire) return
    this._gcAt = Date.now()

    const state = this.state
    const _fetchAts = this._fetchAts
    const check = (v, key) => {
      if (this.isDirty(key)) return true
      const cacheAt = _fetchAts[key]
      // if (!(cacheAt && cacheAt > expire)) {
      //   console.log('gc', this.name, key, cacheAt, expire - cacheAt)
      // }
      return cacheAt && cacheAt > expire
    }
    state.byId = _.pickBy(state.byId, check)
    state.fetches = _.pickBy(state.fetches, check)
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
