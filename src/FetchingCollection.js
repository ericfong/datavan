import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { isThenable, syncOrThen } from './util/promiseUtil'
import Collection from './Collection'
import { normalizeQueryAndKey, calcQueryKey } from './util/queryUtil'

// @auto-fold here
const getId = (doc, idField) => doc && doc[idField]

// @auto-fold here
function loopResponse(data, idField, importOne, operations) {
  if (!data) return
  if (Array.isArray(data)) return _.each(data, (doc, i) => importOne(doc, getId(doc, idField) || i))

  _.each(data, (value, key) => {
    if (key === '$byId') {
      _.each(value, (d, k) => importOne(d, getId(d, idField) || k))
    } else if (key[0] === '$') {
      const opFunc = operations[key]
      if (opFunc) {
        opFunc(value)
      } else {
        throw new Error(`Unknown import operation ${key}`)
      }
    } else {
      importOne(value, getId(value, idField) || key)
    }
  })
}

// @auto-fold here
function excludeDirty(filter, idField, isDirty) {
  if (Array.isArray(filter)) {
    const ids = _.filter(filter, id => id && !isDirty(id))
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
    if (typeof idMatcher === 'string' && isDirty(idMatcher)) {
      return false
    }
    if (idMatcher.$in) {
      const ids = _.filter(idMatcher.$in, id => id && !isDirty(id))
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
function defaultCalcFetchKey(fetchQuery, option) {
  // $request
  if (fetchQuery.$request) return stringify(fetchQuery.$request)
  // get one id
  if (Array.isArray(fetchQuery) && fetchQuery.length === 1) return fetchQuery[0]
  // normal query
  return calcQueryKey(fetchQuery, option)
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

function _checkFetchAsync(fetchQuery, option, fetchKey) {
  if (fetchKey === false || !this.onFetch) return

  // gc more to sync with remote
  // gc before import to make sure new things is not gc
  this._invalidateForGc()

  const _fetchAts = this._fetchAts
  // console.log('_checkFetchAsync', fetchKey, _fetchAts[fetchKey])
  if (!this.alwaysFetch && _fetchAts[fetchKey]) return
  _fetchAts[fetchKey] = new Date() // prevent async fetch again

  return this.fetch(fetchQuery, option, fetchKey)
}

function _checkFetch(fetchQuery, option, fetchKey) {
  const { duringServerPreload, serverPreloading } = this.context
  if (duringServerPreload && !serverPreloading) return

  const promise = _checkFetchAsync.call(this, fetchQuery, option, fetchKey)
  if (promise) {
    return markFetchPromise(this._fetchPromises, fetchKey, promise)
  }
}

function _prepareFind(_filter, option) {
  const filter = normalizeQueryAndKey(_filter, option, this.idField)
  if (filter === false) {
    return { filter, fetchKey: false }
  }
  if (filter.$request) {
    return {
      filter: _.omit(filter, '$request'),
      fetchKey: option.fetch !== undefined ? option.fetch : this.calcFetchKey(filter, option),
      fetchQuery: filter,
      fetchOnly: Object.keys(filter).length === 1,
    }
  }

  const fetchQuery = excludeDirty(filter, this.idField, this.isDirty.bind(this))
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
    state.requests = state.requests || {}

    const now = new Date()
    const _fetchAts = this._fetchAts
    const setTimeFunc = (v, key) => (_fetchAts[key] = now)
    _.each(state.byId, setTimeFunc)
    _.each(state.requests, setTimeFunc)
  }

  calcFetchKey(remoteQuery, option) {
    return defaultCalcFetchKey(remoteQuery, option)
  }

  get(id, option = {}) {
    if (!id) return undefined
    if (!this.isDirty(id)) {
      const ids = [id]
      _checkFetch.call(this, ids, option, this.calcFetchKey(ids, option))
    }
    return super.get(id)
  }

  find(_filter, option = {}) {
    const { filter, fetchKey, fetchQuery, fetchOnly } = _prepareFind.call(this, _filter, option)
    // TODO prevent fetch when array of ids all hit
    _checkFetch.call(this, fetchQuery, option, fetchKey)
    return fetchOnly ? this.state.requests[fetchKey] : this._findNormalized(filter, option)
  }

  findAsync(_filter, option = {}) {
    const { filter, fetchKey, fetchQuery, fetchOnly } = _prepareFind.call(this, _filter, option)
    return Promise.resolve(_checkFetchAsync.call(this, fetchQuery, option, fetchKey)).then(
      () => (fetchOnly ? this.state.requests[fetchKey] : this._findNormalized(filter, option))
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

  importAll(ops, fetchKey) {
    this._gc()

    const mutation = { byId: {} }
    const stateById = this.state.byId
    const mutationById = mutation.byId
    const _fetchAts = this._fetchAts
    const idField = this.idField
    const now = new Date()
    loopResponse(
      ops,
      idField,
      (doc, id) => {
        if (this.isDirty(id)) return
        const castedDoc = this.cast(doc)
        mutationById[id] = typeof castedDoc === 'object' ? { ...stateById[id], ...castedDoc } : castedDoc
        _fetchAts[id] = now
      },
      {
        $unset(value) {
          mutationById.$unset = value
        },
        $request(value) {
          if (fetchKey) {
            mutation.requests = { [fetchKey]: value }
          } else {
            console.error('No fetchKey for $request', value)
          }
        },
        $relations: relations => {
          _.each(relations, (data, name) => {
            const relatedCollection = this[name]
            if (relatedCollection) {
              relatedCollection.importAll(data)
            } else {
              console.error(`Cannot access ${name} when import data into ${name} from ${this.name}. Forget requires: ['${name}'] ?`)
            }
          })
        },
      }
    )
    // console.log('importAll', mutation)
    this.mutateState(mutation)
    this._forceChangeDebounce()
  }

  _forceChangeDebounce() {
    // force connect re-run to indicate change of isFetching OR gc
    this.state = { ...this.state }
    this.onChangeDebounce()
  }

  isDirty(key) {
    return this.isLocalId(key)
  }

  invalidate(key) {
    if (!this.onFetch) return
    if (key) {
      delete this._fetchAts[key]
    } else {
      this._fetchAts = {}
    }
    this._forceChangeDebounce()
  }

  autoInvalidate() {
    if (!this.onFetch) return
    if (this._invalidateForGc()) this._forceChangeDebounce()
  }

  gcTime = 60 * 1000
  _gcAt = 0
  _shouldRunGc = false

  _invalidateForGc() {
    const expire = Date.now() - this.gcTime
    if (this._gcAt > expire) return false
    this._gcAt = Date.now()
    this._fetchAts = _.pickBy(this._fetchAts, fetchAt => fetchAt > expire)
    this._shouldRunGc = true
    return true
  }

  _gc() {
    if (!this.onFetch || !this._shouldRunGc) return
    this._shouldRunGc = false

    const state = this.state
    const _fetchAts = this._fetchAts
    const shouldKeep = (v, key) => {
      const keep = this.isDirty(key) || _fetchAts[key]
      // if (!keep) console.log('gc', this.name, key)
      return keep
    }
    state.byId = _.pickBy(state.byId, shouldKeep)
    state.requests = _.pickBy(state.requests, shouldKeep)
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
