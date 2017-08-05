import _ from 'lodash'
import Mingo from 'mingo'

import { markMissIds } from './defaults'

// const emptyResultArray = []

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

function doQuery(data, query) {
  if (Object.keys(query).length === 0) {
    return _.values(data)
  }
  const mingoQuery = new Mingo.Query(query)
  const filterFunc = doc => doc && mingoQuery.test(doc)
  return _.filter(data, filterFunc)
}

export function getQueryIds(query, idField) {
  if (Array.isArray(query)) return query
  const idQuery = query[idField]
  if (idQuery) {
    if (Array.isArray(idQuery.$in)) return idQuery.$in
    if (typeof idQuery === 'string') return [idQuery]
  }
}

function filterDataByIds(self, data, ids, option) {
  return ids.reduce((result, id) => {
    markMissIds(data, id, option)
    const doc = data[id]
    if (doc) result.push(doc)
    return result
  }, [])
}

export function prepareFindData(self, query, option) {
  if (option.preparedData) return
  const data = self.getData()
  const ids = getQueryIds(query, self.idField)
  if (ids) {
    option.preparedData = filterDataByIds(self, data, ids, option)
  } else {
    option.preparedData = data

    // signal Fetcher to refetch
    option.missQuery = true
  }
}

function doFindData(self, query, option) {
  const preparedData = option.preparedData

  // id Array
  if (Array.isArray(query)) {
    return processOption(preparedData, option)
  }

  // request-only (only for Fetcher case?)
  if (query.$request) {
    if (Object.keys(query).length === 1) {
      return self.getState().requests[option.queryKey]
    }
    query = _.omit(query, '$request')
  }

  const result = self.onFind(preparedData, query, option)
  if (result !== undefined) {
    return result
  }

  return processOption(doQuery(preparedData, query), option)
}

export function findData(self, query, option) {
  prepareFindData(self, query, option)
  return doFindData(self, query, option)
}
