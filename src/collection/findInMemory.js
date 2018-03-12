import _ from 'lodash'

import { queryData, pickBy } from './query'

// @auto-fold here
function mongoToLodash(sort) {
  const fields = []
  const orders = []
  _.each(sort, (v, k) => {
    fields.push(k)
    orders.push(v < 0 ? 'desc' : 'asc')
  })
  return [fields, orders]
}

function postFind(collection, arr, option) {
  if (option) {
    if (option.sort) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('find option "sort" is deprecated! Please use _.orderBy(find(query), ...)) to sort')
      }
      if (Array.isArray(option.sort)) {
        arr = _.orderBy(arr, ...option.sort)
      } else {
        const [fields, orders] = mongoToLodash(option.sort)
        arr = _.orderBy(arr, fields, orders)
      }
    }

    // convert to other object
    if (option.keyBy) {
      if (option.keyBy !== collection.idField) {
        arr = _.keyBy(arr, option.keyBy)
      }
      if (option.keyByValue) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('find option "keyByValue" is deprecated! Please use _.mapValues(find(query), obj => _.get(obj, "keyByValue"))')
        }
        arr = _.mapValues(arr, obj => _.get(obj, option.keyByValue))
      }
    } else if (option.groupBy) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('find option "groupBy" is deprecated! Please use _.groupBy(find(query), "group-by-field")')
      }
      arr = _.groupBy(arr, option.groupBy)
    } else if (option.map) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('find option "map" is deprecated! Please use _.map(find(query), "map-field")')
      }
      arr = _.map(arr, option.map)
    } else if (option.distinct) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('find option "distinct" is deprecated! Please use _.uniq(_.map(find(query), "distinct-field"))')
      }
      arr = _.uniq(_.map(arr, option.distinct))
    }
    // NOTE no need to support fields in memory
  }
  return arr
}

export function findInMemory(self, query, option = {}) {
  let byId = queryData(self, option)

  // query is mingo query
  const doFilter = (_docs = byId, _query = query) => pickBy(_docs, _query)
  if (option.filterHook) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('find option "filterHook" is deprecating! Please use inResponse')
    }
    byId = option.filterHook(doFilter, byId, query, option, self)
  } else {
    byId = doFilter(byId, query)
  }

  byId = postFind(self, byId, option)

  if (!option.keyBy) {
    if (!Array.isArray(byId)) {
      byId = _.values(byId)
    }
    if (option.skip || option.limit) {
      // if (process.env.NODE_ENV !== 'production') {
      //   console.warn('find option "skip" and "limit" is deprecating! Please use inResponse')
      // }
      byId = _.slice(byId, option.skip || 0, option.limit)
    }
  }
  return byId
}
