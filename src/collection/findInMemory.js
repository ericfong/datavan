import _ from 'lodash'
import Mingo from 'mingo'

export function runHook(hook, next, ...args) {
  if (hook) return hook(next, ...args)
  if (next) return next(...args)
}

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

export const queryTester = query => {
  if (Object.keys(query).length === 0) return () => true
  const mingoQuery = new Mingo.Query(query)
  return doc => doc && mingoQuery.test(doc)
}

const filter = (collection, docs, query) => _.filter(docs, queryTester(query))

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
  let data = self.getAll()

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

export default function findInMemory(collection, query, option = {}) {
  let docs = prepareFindData(collection, query, option)
  // prevent re-use option
  delete option._preparedData

  // query is object instead of id-array  (id-array should be done by prepareFindData)
  if (!Array.isArray(query)) {
    const start = process.env.NODE_ENV === 'development' && Date.now()

    docs = runHook(option.filterHook || collection.filterHook, filter, collection, docs, query, option)

    if (process.env.NODE_ENV === 'development' && !collection.store.vanCtx.inConnectOnChange) {
      const duration = Date.now() - start
      if (duration > 60) {
        console.warn(`Slow(${duration}ms) Find Query! Please use connectOnChange to cache your connect logic`)
      }
    }
  }

  return runHook(option.postFindHook || collection.postFindHook, postFind, docs, option)
}
