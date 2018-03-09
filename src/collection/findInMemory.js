import _ from 'lodash'
import Mingo from 'mingo'

import { getAll } from '.'

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

export const queryTester = query => {
  const mingoQuery = new Mingo.Query(query)
  return doc => doc && mingoQuery.test(doc)
}

export const pickBy = (docs, query) => {
  if (_.isEmpty(query)) return docs
  if (typeof query === 'string' || Array.isArray(query)) {
    return _.pick(docs, query)
  }
  return _.pickBy(docs, queryTester(query))
}

// @auto-fold here
function pickDataByIds(self, data, ids, option) {
  const { fetchMaxAge, _byIdAts } = self
  const expire = fetchMaxAge > 0 ? Date.now() - fetchMaxAge : 0
  let _allIdsHit = true
  const ret = ids.reduce((result, id) => {
    if (id in data) {
      result[id] = data[id]
    }
    if (!(_byIdAts[id] > expire)) {
      _allIdsHit = false
    }
    return result
  }, {})
  option._allIdsHit = _allIdsHit
  return ret
}

export function getQueryIds(query, idField) {
  if (!query || Array.isArray(query)) return query
  const idQuery = query[idField]
  if (idQuery) {
    if (Array.isArray(idQuery.$in)) return idQuery.$in
    if (typeof idQuery === 'string') return [idQuery]
  }
}

export function prepareFindData(self, query, option) {
  if (option._preparedData) return option._preparedData
  let data = getAll(self)

  if (option.inOriginal) {
    data = _.omitBy({ ...data, ...self.getState().originals }, v => v === null)
  } else if (option.inResponse && option.queryString) {
    const res = self._inResponses[option.queryString]
    if (res) data = res.byId || res
  }

  const ids = getQueryIds(query, self.idField)
  if (ids) {
    data = pickDataByIds(self, data, ids, option)
  }

  option._preparedData = data
  return data
}

export function findInMemory(collection, query, option = {}) {
  const hasQuery = !_.isEmpty(query)

  let docs = prepareFindData(collection, query, option)
  // prevent re-use option
  delete option._preparedData

  if (hasQuery && !Array.isArray(query)) {
    // query is mingo query
    const doFilter = (_docs = docs, _query = query) => _.pickBy(_docs, queryTester(_query))

    if (option.filterHook) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('find option "filterHook" is deprecating! Please use inResponse')
      }
      docs = option.filterHook(doFilter, docs, query, option, collection)
    } else {
      docs = doFilter(docs, query)
    }
  }

  docs = postFind(collection, docs, option)

  if (!option.keyBy && !Array.isArray(docs)) {
    docs = _.values(docs)
  }
  if (option.skip || option.limit) {
    // if (process.env.NODE_ENV !== 'production') {
    //   console.warn('find option "skip" and "limit" is deprecating! Please use inResponse')
    // }
    docs = _.slice(docs, option.skip || 0, option.limit)
  }
  return docs
}
