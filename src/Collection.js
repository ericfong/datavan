import _ from 'lodash'
import stringfy from 'fast-stable-stringify'
import {defaultMemoize as reselectMemoize} from 'reselect'
import sift from 'sift'

import KeyValueStore from './KeyValueStore'
import {stateMemoizeTable} from './util/memoizeUtil'
import {then} from './util/promiseUtil'


function mongoToLodash(sort) {
  const fields = []
  const orders = []
  _.each(sort, (v, k) => {
    fields.push(k)
    orders.push(v < 0 ? 'desc' : 'asc')
  })
  return [fields, orders]
}

export function calcFetchCacheKey(query, option) {
  return stringfy([query, _.pick(option, 'sort', 'skip', 'limit', 'keyBy', 'groupBy')])
}


export default class Collection extends KeyValueStore {
  _getStateArray = reselectMemoize(state => _.values(state))
  getStateArray() {
    return this._getStateArray(this.getState())
  }

  // internal _find, won't trigger re-fetch from backend
  _find = stateMemoizeTable(
    // runner
    (state, query, option) => {
      if (_.isEmpty(query)) {
        return this._postFind(_.values(state), option)
      }

      const result = this._findImplementation && this._findImplementation(state, query, option)
      if (result !== undefined) {
        return result
      }

      return this._postFind(_.filter(state, sift(query)), option)
    },
    // get state
    () => [this.getState()],
    // get memoize key
    calcFetchCacheKey,
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
  find(query, option) {
    return this._find(query, option)
  }

  findOne(query, option) {
    return then(this.find(query, {...option, limit: 1}), list => list[0])
  }

  search($search, option) {
    return this.find({$search}, option)
  }

  count(query) {
    return _.size(this.find(query))
  }

  genId() {
    return 'tmp-' + Math.random()
  }

  isLocalId(docId) {
    return docId && _.startsWith(docId, 'tmp-')
  }

  set(id, value) {
    if (typeof id === 'object') super.set(id[this.idField], id)
    else super.set(id, value)
  }

  idField = '_id'

  insert(doc) {
    const idField = this.idField
    if (!doc[idField]) {
      doc[idField] = this.genId()
    }
    this.setState({ [doc[idField]]: doc })
    return doc
  }

  update(query, update) {
    // TODO detect update at least contain $set, $push, ... opertation ?
    // internal _find, won't trigger re-fetch from backend
    const docs = this._find(query)
    const mutation = {}
    const idField = this.idField
    _.each(docs, doc => {
      mutation[doc[idField]] = update
    })
    this.mutate(mutation)
    return mutation
  }

  remove(query) {
    const idField = this.idField
    const delTable = _.reduce(this._find(query), (ret, doc) => {
      ret[doc[idField]] = undefined
      return ret
    }, {})
    this.setState(delTable)
    return delTable
  }
}
