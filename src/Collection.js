import _ from 'lodash'
import mutateHelper from 'immutability-helper'
import sift from 'sift'

import KeyValueStore from './KeyValueStore'
import { syncOrThen } from './util/promiseUtil'
import { normalizeQuery, calcFindKey, processOption, emptyResultArray } from './util/queryUtil'

// @auto-fold here
function filterStateByIds(state, ids) {
  return ids.reduce((result, id) => {
    const doc = state[id]
    if (doc) result.push(doc)
    return result
  }, [])
}

function findHeavy(self, byId, query, option) {
  // should after memoize to prevent return new Array all the time
  if (Array.isArray(query)) {
    return processOption(filterStateByIds(byId, query), option)
  }

  if (Object.keys(query).length === 0) {
    return processOption(_.values(byId), option)
  }

  // can contain other matchers, so consider as heavy
  const idQuery = query[self.idField]
  const filteredState = idQuery && idQuery.$in ? filterStateByIds(byId, idQuery.$in) : byId

  const result = self._findImplementation && self._findImplementation(filteredState, query, option)
  if (result !== undefined) {
    return result
  }

  return processOption(_.filter(filteredState, sift(query)), option)
}

function findHeavyAndMemoize(self, query, option) {
  const byId = self.state.byId
  // setup memory
  if (byId !== self._lastById) self._findMemory = {}
  self._lastById = byId
  const _findMemory = self._findMemory

  // calc cacheKey
  const cacheKey = (option && option.cacheKey) || calcFindKey(query, option)
  if (option) option.cacheKey = cacheKey

  // return cache if exists
  const lastResult = _findMemory[cacheKey]
  if (lastResult) return lastResult

  // gen new result and put into cache
  return (_findMemory[cacheKey] = findHeavy(self, byId, query, option))
}

export default class Collection extends KeyValueStore {
  idField = '_id'

  _lastById
  _findMemory
  _find(_query, option) {
    const query = normalizeQuery(_query, option, this.idField)
    if (query === false) return emptyResultArray
    return findHeavyAndMemoize(this, query, option)
  }

  // internal _find, won't trigger re-fetch from backend
  find(query, option) {
    return this._find(query, option)
  }

  findOne(query, option) {
    return syncOrThen(this.find(query, { ...option, limit: 1 }), list => list[0])
  }

  // search($search, option) {
  //   return this.find({ $search }, option)
  // }

  isLocalId(docId) {
    return _.startsWith(docId, 'tmp-')
  }

  // ==================================
  // insert or update functions
  // ==================================

  genId() {
    return `tmp-${Math.random()}`
  }

  set(id, value) {
    if (typeof id === 'object') {
      const castedDoc = this.cast(id)
      super.set(castedDoc[this.idField], castedDoc)
    } else {
      super.set(id, this.cast(value))
    }
  }

  insert(_docs) {
    const inputIsArray = Array.isArray(_docs)
    const docs = inputIsArray ? _docs : [_docs]
    const idField = this.idField

    const change = {}
    const castedDocs = _.map(docs, d => {
      const castedDoc = this.cast(d)
      let id = castedDoc[idField]
      if (!id) {
        id = castedDoc[idField] = this.genId()
      }
      change[id] = castedDoc
      return castedDoc
    })
    this.setAll(change)

    return inputIsArray ? castedDocs : castedDocs[0]
  }

  update(query, update) {
    const oldDocs = this._find(query)
    // internal _find, won't trigger re-fetch from backend
    const change = {}
    const idField = this.idField
    _.each(oldDocs, doc => {
      // TODO use mongo operators like $set, $push...
      const newDoc = mutateHelper(doc, update)

      // delete and set the newDoc with new id
      change[doc[idField]] = undefined
      if (newDoc) {
        change[newDoc[idField]] = newDoc
      }
    })
    this.setAll(change)
    return oldDocs
  }

  remove(query) {
    const removedDocs = this._find(query)
    const change = {}
    const idField = this.idField
    _.each(removedDocs, doc => {
      change[doc[idField]] = undefined
    })
    this.setAll(change)
    return removedDocs
  }
}
