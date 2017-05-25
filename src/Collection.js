import _ from 'lodash'
import mutateHelper from 'immutability-helper'
import { defaultMemoize as reselectMemoize } from 'reselect'
import sift from 'sift'

import KeyValueStore from './KeyValueStore'
import { stateMemoizeTable } from './util/memoizeUtil'
import { syncOrThen } from './util/promiseUtil'
import { normalizeQuery, calcFindKey, mongoToLodash, emptyResultArray } from './util/queryUtil'

function filterStateByIds(state, ids) {
  return ids.reduce((result, id) => {
    const doc = state[id]
    if (doc) result.push(doc)
    return result
  }, [])
}

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
        return this._postFind(filterStateByIds(state, query), option)
      }

      const idQuery = query[this.idField]
      const filteredState = idQuery && idQuery.$in ? filterStateByIds(state, idQuery.$in) : state

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
      } else if (option.map) {
        arr = _.map(arr, option.map)
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

  // TODO consider remove this to favour load() and reload() ???
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
      const castedDoc = this.cast(id)
      super.set(castedDoc[this.idField], castedDoc)
    } else {
      super.set(id, this.cast(value))
    }
  }

  idField = '_id'

  insert(_docs) {
    const inputIsArray = Array.isArray(_docs)
    const docs = inputIsArray ? _docs : [_docs]
    const idField = this.idField

    const changes = {}
    const castedDocs = _.map(docs, d => {
      const castedDoc = this.cast(d)
      let id = castedDoc[idField]
      if (!id) {
        id = castedDoc[idField] = this.genId()
      }
      changes[id] = castedDoc
      return castedDoc
    })
    this.setAll({ byId: changes })

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
    this.setAll({ byId: change })
    return oldDocs
  }

  remove(query) {
    const removedDocs = this._find(query)
    const change = {}
    const idField = this.idField
    _.each(removedDocs, doc => {
      change[doc[idField]] = undefined
    })
    this.setAll({ byId: change })
    return removedDocs
  }
}
