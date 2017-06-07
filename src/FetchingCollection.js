import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { isThenable, syncOrThen } from './util/promiseUtil'
import Collection from './Collection'
import { normalizeQueryAndKey, emptyResultArray, calcQueryKey } from './util/queryUtil'

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
function excludeQueryLocalId(query, idField, isLocalId) {
  if (Array.isArray(query)) {
    const ids = _.filter(query, id => id && !isLocalId(id))
    if (ids.length === 0) {
      return false
    }
    return ids
  }
  if (query[idField]) {
    const newQuery = { ...query }
    const idMatcher = query[idField]
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
  return query
}

// @auto-fold here
function markFetchPromise(fetchPromises, cacheKey, result) {
  if (isThenable(result)) {
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
  return result
}

export default class FetchingCollection extends Collection {
  // Override: onFetch(), alwaysFetch
  _accessAts = {}

  constructor(state) {
    super(state)
    state.requests = state.requests || {}

    const now = new Date()
    const _accessAts = this._accessAts
    const setAccessAtFunc = (v, cacheKey) => (_accessAts[cacheKey] = now)
    _.each(state.byId, setAccessAtFunc)
    _.each(state.requests, setAccessAtFunc)
  }

  get(id) {
    this._checkFetchSync([id], { fetchKey: id })
    return super.get(id)
  }

  find(_query, option = {}) {
    const query = normalizeQueryAndKey(_query, option, this.idField)
    if (query === false) return emptyResultArray
    this._checkFetchSync(query, option)
    return super.find(query, option)
  }

  findAsync(_query, option = {}) {
    const query = normalizeQueryAndKey(_query, option, this.idField)
    if (query === false) return Promise.resolve(emptyResultArray)
    return Promise.resolve(this._checkFetchAsync(query, option)).then(() => super.find(query, option))
  }

  request(req, option = {}) {
    // TODO may need to combine with find. means have find-only, request-only or find-local-but-request-remote
    const cacheKey = (option.fetchKey = option.cacheKey = stringify(req))
    this._checkFetchSync({ $request: req }, option)
    return this.state.requests[cacheKey]
  }

  requestAsync(req, option = {}) {
    const cacheKey = (option.fetchKey = option.cacheKey = stringify(req))
    return Promise.resolve(this._checkFetchAsync({ $request: req }, option)).then(() => this.state.requests[cacheKey])
  }

  calcFetchKey(remoteQuery, option) {
    return calcQueryKey(remoteQuery, option)
  }

  _checkFetchAsync(query, option) {
    if (!this.onFetch) return false
    if (option.load === 'local') return false

    const remoteQuery = excludeQueryLocalId(query, this.idField, this.isLocalId)
    if (remoteQuery === false) return false

    // calc fetchKey based on remoteQuery
    if (!option.fetchKey) {
      option.fetchKey = this.calcFetchKey(remoteQuery, option)
    }
    const fetchKey = option.fetchKey

    const _accessAts = this._accessAts
    // console.log('_checkFetchAsync', fetchKey, !!_accessAts[fetchKey])
    if (!this.alwaysFetch && _accessAts[fetchKey]) return false
    _accessAts[fetchKey] = new Date() // prevent async fetch again

    return this.fetch(remoteQuery, option)
  }

  _checkFetchSync(query, option) {
    const { duringServerPreload, serverPreloading } = this.context
    if (duringServerPreload && !serverPreloading) return false
    const result = this._checkFetchAsync(query, option)
    if (result) return markFetchPromise(this._fetchPromises, option.cacheKey, result)
    return result
  }

  fetch(query, option) {
    return syncOrThen(this.onFetch(query, option), ret => {
      // console.log('fetch result', ret)
      this.importAll(ret, option.cacheKey)
      return ret
    })
  }

  _fetchPromises = {}

  invalidate(key) {
    if (key) {
      delete this._accessAts[key]
    } else {
      this._accessAts = {}
    }
    // NOTE change state object to force connect to think collection have been updated and re-run
    // will also invalidate all find memory cache
    this.state = { ...this.state }
  }

  importAll(ops, cacheKey) {
    const mutation = { byId: {} }
    const byId = mutation.byId
    const _accessAts = this._accessAts
    const idField = this.idField
    const now = new Date()
    loopResponse(ops, idField, {
      // handleById
      $byId: (doc, id) => {
        if (this.isDirty(id)) return
        byId[id] = this.cast(doc)
        _accessAts[id] = now
      },
      $unset(value) {
        byId.$unset = value
      },
      $request(value) {
        mutation.requests = { [cacheKey]: value }
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
    const _accessAts = this._accessAts
    const check = (v, key) => {
      if (this.isDirty(key)) return true
      const cacheAt = _accessAts[key]
      // if (!(cacheAt && cacheAt > expire)) {
      //   console.log('gc', this.name, key, cacheAt, expire - cacheAt)
      // }
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
