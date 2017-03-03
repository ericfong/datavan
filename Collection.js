import _ from 'lodash'
import {defaultMemoize as memoize} from 'reselect'
import sift from 'sift'
// import Mingo from 'mingo'

import KeyValueStore from './KeyValueStore'
import createMemoize from './memoizeUtil'


function mongoToLodash(sort) {
  const fields = []
  const orders = []
  _.each(sort, (v, k) => {
    fields.push(k)
    orders.push(v < 0 ? 'desc' : 'asc')
  })
  return [fields, orders]
}


// export const QUERY_KEY_PREFIX = '?'


export default class Collection extends KeyValueStore {
  // _findCursor(query, option) {
  //   const cursor = Mingo.find(_.values(this._getStore()), query)
  //   if (option) {
  //     if (option.sort) cursor.sort(option.sort)
  //     if (option.limit) cursor.limit(option.limit)
  //     if (option.skip) cursor.skip(option.skip)
  //   }
  //   return cursor
  // }

  // getQueryCacheId(query) {
  //   return QUERY_KEY_PREFIX + jsonStableStringfy(query)
  // }

  _getStateArray = memoize(state => _.values(state))
  getStateArray() {
    return this._getStateArray(this.getState())
  }

  // internal _find, won't trigger re-fetch from backend
  _find = createMemoize((stateArray, query, option) => {
    let arr = _.isEmpty(query) ? stateArray : _.filter(stateArray, sift(query))
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
  }, () => [this.getStateArray()])

  find(query, option) {
    return this._find(query, option)
  }

  findOne(query, option) {
    return this.find(query, {...option, limit: 1})[0]
  }

  count(query) {
    return _.size(this.find(query))
  }

  genId() {
    return 'tmp-' + Math.random()
  }

  isLocalId(docId) {
    return docId && docId.startsWith('tmp-')
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
