import _ from 'lodash'
import Mingo from 'mingo'

import { _getAll } from '.'

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
    if (option.skip || option.limit) {
      // FIXME [direct-remote-result]
      arr = _.slice(arr, option.skip || 0, option.limit)
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
  if (Object.keys(query).length === 0) return () => true
  const mingoQuery = new Mingo.Query(query)
  return doc => doc && mingoQuery.test(doc)
}

// @auto-fold here
function filterDataByIds(self, data, ids, option) {
  const { fetchMaxAge } = self
  let _allIdsHit = true
  const ret = ids.reduce((result, id) => {
    if (id in data) {
      result.push(data[id])
    }
    if (!(fetchMaxAge > 0 ? self._byIdAts[id] > Date.now() - fetchMaxAge : self._byIdAts[id])) {
      _allIdsHit = false
    }
    return result
  }, [])
  option._allIdsHit = _allIdsHit
  return ret
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

export function prepareFindData(self, query, option) {
  if (option._preparedData) return option._preparedData
  let data = _getAll(self)

  if (option.inOriginal) {
    data = _.omitBy({ ...data, ...self.getState().originals }, v => v === null)
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

export function findInMemory(collection, query, option = {}) {
  let docs = prepareFindData(collection, query, option)
  // prevent re-use option
  delete option._preparedData

  // query is object instead of id-array  (id-array should be done by prepareFindData)
  if (!Array.isArray(query)) {
    const start = process.env.NODE_ENV === 'development' && Date.now()

    const doFilter = (_docs = docs, _query = query) => {
      return (option.keyBy === collection.idField ? _.pickBy : _.filter)(_docs, queryTester(_query))
    }

    if (option.filterHook) {
      // FIXME [direct-remote-result] Should put $search into option
      docs = option.filterHook(doFilter, docs, query, option, collection)
    } else {
      docs = doFilter(docs, query)
    }

    if (process.env.NODE_ENV === 'development' && !collection.store.vanCtx.inConnectOnChange) {
      const duration = Date.now() - start
      if (duration > 60) {
        console.warn(`Slow(${duration}ms) Find Query! Please use connectOnChange to cache your connect logic`)
      }
    }
  }

  return postFind(collection, docs, option)
}
