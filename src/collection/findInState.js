import _ from 'lodash'
import Mingo from 'mingo'

import { getQueryIds } from './util/idUtil'
import runHook from './util/runHook'
import { getState, getAll } from './base'

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
function postFind(arr, option) {
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
      if (option.keyByValue) arr = _.mapValues(arr, obj => _.get(obj, option.keyByValue))
    } else if (option.groupBy) {
      arr = _.groupBy(arr, option.groupBy)
    } else if (option.map) {
      arr = _.map(arr, option.map)
    } else if (option.distinct) {
      arr = _.uniq(_.map(arr, option.distinct))
    }
    // NOTE no need to support fields in memory
  }
  return arr
}

// @auto-fold here
const filter = (collection, docs, query) => {
  if (Object.keys(query).length === 0) {
    return _.values(docs)
  }
  const mingoQuery = new Mingo.Query(query)
  const filterFunc = doc => doc && mingoQuery.test(doc)
  return _.filter(docs, filterFunc)
}

// @auto-fold here
function filterDataByIds(self, data, ids, option) {
  const { fetchMaxAge } = self
  let allIdsHit = true
  const ret = ids.reduce((result, id) => {
    if (id in data) {
      result.push(data[id])
    }
    if (!(fetchMaxAge > 0 ? self._byIdAts[id] > Date.now() - fetchMaxAge : self._byIdAts[id])) {
      allIdsHit = false
    }
    return result
  }, [])
  option.allIdsHit = allIdsHit
  return ret
}

export function prepareFindData(self, query, option) {
  if (option._preparedData) return option._preparedData
  let data = getAll(self)

  if (option.inOriginal) {
    data = _.omitBy({ ...data, ...getState(self).originals }, v => v === null)
  }

  const ids = getQueryIds(query, self.idField)
  let prepared
  if (ids) {
    prepared = filterDataByIds(self, data, ids, option)
  } else {
    prepared = data
  }
  option._preparedData = prepared
  return prepared
}

export default function findInState(collection, query, option) {
  let docs = prepareFindData(collection, query, option)
  // prevent re-use option
  delete option._preparedData

  // query is object instead of id-array  (id-array should be done by prepareFindData)
  if (!Array.isArray(query)) {
    docs = runHook(option.filterHook || collection.filterHook, filter, collection, docs, query, option)
  }

  return runHook(option.postFindHook || collection.postFindHook, postFind, docs, option)
}
