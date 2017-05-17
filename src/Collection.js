import _ from 'lodash'
import mutateHelper from 'immutability-helper'
import { defaultMemoize as reselectMemoize } from 'reselect'
import sift from 'sift'

import KeyValueStore from './KeyValueStore'
import { stateMemoizeTable } from './util/memoizeUtil'
import { syncOrThen } from './util/promiseUtil'
import { normalizeQuery, calcFindKey, mongoToLodash, emptyResultArray } from './util/queryUtil'
import { DELETE_FROM_STORE } from './defineStore'

export default class Collection extends KeyValueStore {
  _getStateArray = reselectMemoize(state => _.values(state))
  getStateArray() {
    return this._getStateArray(this.getState())
  }

  // internal _find, won't trigger re-fetch from backend
  _findMem = stateMemoizeTable(
    // runner
    (state, query, option) => {
      if (_.isEmpty(query)) {
        return this._postFind(_.values(state), option)
      }

      if (Array.isArray(query)) {
        return this._postFind(query.map(id => state[id]), option)
      }

      const idQuery = query[this.idField]
      const filteredState = idQuery && idQuery.$in ? idQuery.$in.map(id => state[id]) : state

      const result = this._findImplementation && this._findImplementation(filteredState, query, option)
      if (result !== undefined) {
        return result
      }

      return this._postFind(_.filter(filteredState, sift(query)), option)
    },
    // get state
    () => [this.getState()],
    // get memoize key
    calcFindKey
  )

  _postFind(arr, option) {
    if (option) {
      if (option.sort) {
        const [fields, orders] = mongoToLodash(option.sort)
        arr = _.orderBy(arr, fields, orders)
      }
      if (option.skip || option.limit) {
        arr = _.slice(arr, option.skip || 0, option.limit)
      }
      // convert to other object
      if (option.keyBy) {
        arr = _.keyBy(arr, option.keyBy)
      } else if (option.groupBy) {
        arr = _.groupBy(arr, option.groupBy)
      }
    }
    return arr
  }

  // query can be null OR Array of ids OR object of mongo query
  _find(_query, option) {
    const query = normalizeQuery(_query, this.idField)
    if (!query) return emptyResultArray
    return this._findMem(query, option)
  }

  find(query, option) {
    return this._find(query, option)
  }

  findOne(query, option) {
    return syncOrThen(this.find(query, { ...option, limit: 1 }), list => list[0])
  }

  search($search, option) {
    return this.find({ $search }, option)
  }

  count(query) {
    return _.size(this.find(query))
  }

  genId() {
    return `tmp-${Math.random()}`
  }

  isLocalId(docId) {
    return docId && _.startsWith(docId, 'tmp-')
  }

  set(id, value) {
    if (typeof id === 'object') {
      super.set(id[this.idField], this.insertCast(id))
    } else {
      super.set(id, this.insertCast(value))
    }
  }

  idField = '_id'

  insertCast(doc) {
    return this.cast(doc)
  }

  insert(docs) {
    const idField = this.idField
    if (Array.isArray(docs)) {
      const changes = {}
      const castedDocs = _.map(docs, d => {
        const castedDoc = this.insertCast(d)
        if (!castedDoc[idField]) {
          castedDoc[idField] = this.genId()
        }
        changes[castedDoc[idField]] = castedDoc
        return castedDoc
      })
      this.setAll(changes)
      return castedDocs
    }
    const doc = this.insertCast(docs)
    if (!doc[idField]) {
      doc[idField] = this.genId()
    }
    this.setAll({ [doc[idField]]: doc })
    return doc
  }

  update(query, update) {
    // internal _find, won't trigger re-fetch from backend
    const idField = this.idField
    const changes = {}
    _.each(this._find(query), doc => {
      // TODO use mongo operators like $set, $push...
      const newDoc = mutateHelper(doc, update)
      changes[doc[idField]] = DELETE_FROM_STORE
      if (newDoc) {
        changes[newDoc[idField]] = newDoc
      }
    })
    this.setAll(changes)
    return changes
  }

  remove(query) {
    const idField = this.idField
    const changes = {}
    _.each(this._find(query), doc => {
      changes[doc[idField]] = DELETE_FROM_STORE
    })
    this.setAll(changes)
    return changes
  }
}
