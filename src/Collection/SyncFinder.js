import _ from 'lodash'
import Mingo from 'mingo'

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
    return [idQuery]
  }
}

export default function (table) {
  const { idField, getState, getData, getDataById, onGet, onFind } = table

  function filterDataByIds(data, ids, option) {
    return ids.reduce((result, id) => {
      onGet(data, id, option)
      const doc = data[id]
      if (doc) result.push(doc)
      return result
    }, [])
  }

  function prepareFindData(query, option) {
    if (option.preparedData) return
    const data = getData()
    const ids = getQueryIds(query, idField)
    if (ids) {
      option.preparedData = filterDataByIds(data, ids, option)
    } else {
      option.preparedData = data

      // signal Fetcher to refetch
      option.missQuery = true
    }
  }

  function doFindData(query, option) {
    const preparedData = option.preparedData

    // id Array
    if (Array.isArray(query)) {
      return processOption(preparedData, option)
    }

    // request-only (only for Fetcher case?)
    if (query.$request) {
      if (Object.keys(query).length === 1) {
        return getState().requests[option.queryKey]
      }
      query = _.omit(query, '$request')
    }

    const result = onFind(preparedData, query, option)
    if (result !== undefined) {
      return result
    }

    return processOption(doQuery(preparedData, query), option)
  }

  return Object.assign(table, {
    get(id, option = {}) {
      return getDataById(id, option)
    },

    prepareFindData,

    findData(query, option) {
      prepareFindData(query, option)
      // console.log('findData', option.preparedData, getData())
      return doFindData(query, option)
    },
  })
}
