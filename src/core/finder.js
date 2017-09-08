import _ from 'lodash'
import Mingo from 'mingo'

import { getState } from '../table/base'

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

// @auto-fold here
export function processOption(arr, option) {
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

// @auto-fold here
function doQuery(data, query) {
  if (Object.keys(query).length === 0) {
    return _.values(data)
  }
  const mingoQuery = new Mingo.Query(query)
  const filterFunc = doc => doc && mingoQuery.test(doc)
  return _.filter(data, filterFunc)
}

// @auto-fold here
export function getQueryIds(query, idField) {
  if (Array.isArray(query)) return query
  const idQuery = query[idField]
  if (idQuery) {
    if (Array.isArray(idQuery.$in)) return idQuery.$in
    if (typeof idQuery === 'string') return [idQuery]
  }
}

// @auto-fold here
function filterDataByIds(data, ids) {
  return ids.reduce((result, id) => {
    const doc = data[id]
    if (doc) result.push(doc)
    return result
  }, [])
}

// @auto-fold here
function prepareFindData(table, query) {
  const data = table.onGetAll()
  const ids = getQueryIds(query, table.idField)
  return ids ? filterDataByIds(data, ids) : data
}

export function findData(table, query, option) {
  const preparedData = prepareFindData(table, query)

  // id Array
  if (Array.isArray(query)) {
    return processOption(preparedData, option)
  }

  // request-only (only for Fetcher case?)
  if (query.$request) {
    if (Object.keys(query).length === 1) {
      return getState(table).requests[option.queryKey]
    }
    query = _.omit(query, '$request')
  }

  const onFind = option.onFind || table.onFind
  if (onFind) {
    const result = onFind(preparedData, query, option, table)
    if (result !== undefined) {
      return result
    }
  }

  return processOption(doQuery(preparedData, query), option)
}
