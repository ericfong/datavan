import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { isThenable, syncOrThen } from './util/promiseUtil'
import Collection from './Collection'
import { normalizeQuery, calcFindKey, emptyResultArray } from './util/queryUtil'

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
    const ids = _.filter(query, id => !isLocalId(id))
    if (ids.length === 0) {
      return false
    }
    return ids
  }
  if (query[idField]) {
    const newQuery = { ...query }
    const idMatcher = query[idField]
    if (typeof idMatcher === 'string' && isLocalId(idMatcher)) {
      return false
    }
    if (idMatcher.$in) {
      const ids = _.filter(idMatcher.$in, id => !isLocalId(id))
      if (ids.length === 0) {
        return false
      }
      newQuery[idField].$in = ids
    }
    return newQuery
  }
  return query
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
    if (id && !this.isLocalId(id)) this._checkFetch([id], { cacheKey: id })
    return super.get(id)
  }

  find(_query, option = {}) {
    const query = normalizeQuery(_query, option, this.idField)
    if (query === false) return emptyResultArray
    option.cacheKey = calcFindKey(query, option)
    // calc and shortcut remoteQuery
    const remoteQuery = excludeQueryLocalId(query, this.idField, this.isLocalId)
    if (remoteQuery !== false) this._checkFetch(remoteQuery, option)
    return super.find(query, option)
  }

  findAsync(_query, option = {}) {
    const query = normalizeQuery(_query, option, this.idField)
    // query should be empty
    if (query === false) return Promise.resolve(emptyResultArray)
    const cacheKey = (option.cacheKey = calcFindKey(query, option))
    if (!this._accessAts[cacheKey]) {
      // calc and shortcut remoteQuery
      const remoteQuery = excludeQueryLocalId(query, this.idField, this.isLocalId)
      if (remoteQuery !== false) {
        return Promise.resolve(this.fetch(remoteQuery, option)).then(() => super.find(query, option))
      }
    }
    return Promise.resolve(super.find(query, option))
  }

  request(req, option = {}) {
    const cacheKey = (option.cacheKey = stringify(req))
    this._checkFetch({ $request: req }, option)
    return this.state.requests[cacheKey]
  }

  requestAsync(req, option = {}) {
    const cacheKey = (option.cacheKey = stringify(req))
    if (!this._accessAts[cacheKey]) {
      return this.fetch({ $request: req }, option)
    }
    return Promise.resolve(this.state.requests[cacheKey])
  }

  _checkFetch(query, option) {
    if (!this.onFetch) return false
    const { duringServerPreload, serverPreloading } = this.context
    // duringServerPreload, only load resource that is mark as preload and preload only one time
    // console.log('_checkFetch', query, duringServerPreload, serverPreloading)
    if (duringServerPreload && !serverPreloading) return false

    // have readAt?
    const _accessAts = this._accessAts
    const cacheKey = option.cacheKey
    // console.log('_checkFetch', this.alwaysFetch, cacheKey, !!_accessAts[cacheKey])
    if (!this.alwaysFetch && _accessAts[cacheKey]) return false
    _accessAts[cacheKey] = new Date() // prevent async fetch again

    // fetch
    const result = this.fetch(query, option)
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
