import _ from 'lodash'
import Mingo from 'mingo'

import { getQueryIds } from './util/idUtil'

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
function processOption(arr, option) {
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
    // NOTE no need to support fields in memory
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
function filterDataByIds(self, data, ids, option) {
  let allIdsHit = true
  const ret = ids.reduce((result, id) => {
    // console.log('<<<', id, self._byIdAts[id])
    if (id in data) {
      result.push(data[id])
    }
    if (!self._byIdAts[id]) {
      allIdsHit = false
    }
    return result
  }, [])
  option.allIdsHit = allIdsHit
  return ret
}

export function prepareFindData(self, query, option) {
  if (option.preparedData) return option.preparedData
  const data = self.onGetAll()
  const ids = getQueryIds(query, self.idField)
  let prepared
  if (ids) {
    prepared = filterDataByIds(self, data, ids, option)
  } else {
    prepared = data
  }
  option.preparedData = prepared
  return prepared
}

// @auto-fold here
function runHook(self, hook, firstArg, ...args) {
  if (hook) {
    const result = hook(firstArg, ...args, self)
    if (result) return result
  }
  return firstArg
}

export default function findInState(self, query, option) {
  let docs = prepareFindData(self, query, option)

  // query is object instead of id-array  (id-array should be done by prepareFindData)
  if (!Array.isArray(query)) {
    docs = runHook(self, option.preFind || self.preFind, docs, query, option)

    docs = doQuery(docs, query)

    docs = runHook(self, option.postFind || self.postFind, docs, query, option)
  }

  return processOption(docs, option)
}
