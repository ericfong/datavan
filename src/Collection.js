import _ from 'lodash'
import mutateHelper from 'immutability-helper'
import Mingo from 'mingo'
// import sift from 'sift'

import KeyValueStore from './KeyValueStore'
import { syncOrThen } from './util/promiseUtil'
import { normalizeQueryAndKey, processOption, emptyResultArray, calcQueryKey } from './util/queryUtil'

const BENCHMARK = process.env.NODE_ENV !== 'production' && process.env.BENCHMARK

// @auto-fold here
function filterStateByIds(state, ids) {
  return ids.reduce((result, id) => {
    const doc = state[id]
    if (doc) result.push(doc)
    return result
  }, [])
}

function doFind(self, docs, filter, option) {
  if (BENCHMARK) console.time(`BENCHMARK ${self.name}.doFind ${option.cacheKey}`)

  // should after memoize to prevent return new Array all the time
  if (Array.isArray(filter)) {
    return processOption(filterStateByIds(docs, filter), option)
  }

  if (Object.keys(filter).length === 0) {
    return processOption(_.values(docs), option)
  }

  // can contain other matchers, so consider as heavy
  const idQuery = filter[self.idField]
  const filteredState = idQuery && idQuery.$in ? filterStateByIds(docs, idQuery.$in) : docs

  const result = self._findImplementation && self._findImplementation(filteredState, filter, option)
  if (result !== undefined) {
    return result
  }

  const mingoQuery = new Mingo.Query(filter)
  const filterFunc = doc => doc && mingoQuery.test(doc)
  // const sifter = sift(filter)
  if (BENCHMARK) console.time(`BENCHMARK ${self.name}.doFind-filter ${option.cacheKey}`)
  const filteredDocs = _.filter(filteredState, filterFunc)
  if (BENCHMARK) console.timeEnd(`BENCHMARK ${self.name}.doFind-filter ${option.cacheKey}`)

  const ret = processOption(filteredDocs, option)
  if (BENCHMARK) console.timeEnd(`BENCHMARK ${self.name}.doFind ${option.cacheKey}`)
  return ret
}

export function findDirectly(self, docs, filter, option) {
  const _filter = normalizeQueryAndKey(filter, option, self.idField)
  if (_filter === false) return emptyResultArray
  return doFind(self, docs, _filter, option)
}

function findMemoize(self, query, option) {
  const byId = self.state.byId
  // setup memory
  if (byId !== self._lastById) self._findMemory = {}
  self._lastById = byId
  const _findMemory = self._findMemory

  // return cache if exists
  const cacheKey = (option.cacheKey = option.cacheKey || calcQueryKey(query, option))
  const lastResult = _findMemory[cacheKey]
  if (lastResult) return lastResult

  // gen new result and put into cache
  return (_findMemory[cacheKey] = doFind(self, byId, query, option))
}

export default class Collection extends KeyValueStore {
  idField = '_id'

  _lastById
  _findMemory
  _findNormalized(filter, option) {
    if (filter === false) return emptyResultArray
    return findMemoize(this, filter, option)
  }
  _find(_filter, option = {}) {
    const filter = normalizeQueryAndKey(_filter, option, this.idField)
    return this._findNormalized(filter, option)
  }

  // internal _find, won't trigger re-fetch from backend
  find(filter, option) {
    return this._find(filter, option)
  }

  findOne(filter, option) {
    return syncOrThen(this.find(filter, { ...option, limit: 1 }), list => list[0])
  }

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
    this.setAll({ $unset: _.map(removedDocs, this.idField) })
    return removedDocs
  }
}
