import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { TMP_ID_PREFIX } from './collection-util'

export const defaultGetFetchKey = (query, option) => stringify({ ..._.omitBy(option, (v, k) => k[0] === '_'), ...query })

// @auto-fold here
const markPromise = (coll, fetchKey, func) => {
  const { _fetchPromises } = coll
  const oldPromise = _fetchPromises[fetchKey]
  if (oldPromise) return oldPromise

  const markPromiseDone = () => {
    delete _fetchPromises[fetchKey]
    if (Object.keys(_fetchPromises).length === 0) {
      coll.getDb().dispatch(coll.name, { fetchingAt: { $set: undefined } })
    }
  }
  const promise = (_fetchPromises[fetchKey] = func()
    .then(ret => {
      markPromiseDone()
      return ret
    })
    .catch(err => {
      markPromiseDone()
      return Promise.reject(err)
    }))
  // ensure fetchingAt is set to coll instantaneously
  const fetchingAt = Date.now()
  coll.getDb().dispatch(coll.name, { fetchingAt: { $set: fetchingAt } })
  return promise
}

const normalizeQueryBasic = (query, idField) => {
  // query = [ids]
  if (Array.isArray(query)) {
    if (query.length === 0) return false
    return { [idField]: { $in: query } }
  }
  const fetchQuery = { ...query }
  if (idField in fetchQuery) {
    const idFieldValue = fetchQuery[idField]
    if (!idFieldValue) {
      // query = { id: falsy }
      return false
    } else if (typeof idFieldValue === 'string') {
      // query = { id: idStr }
      fetchQuery[idField] = { $in: [idFieldValue] }
    }
  }
  return fetchQuery
}

const isTmpId = id => !id || _.startsWith(id, TMP_ID_PREFIX)
const sortUniqFilter = ids => _.filter(_.sortedUniq(ids.sort()), id => !isTmpId(id))
// @auto-fold here
const defaultGetFetchQuery = fetchQuery => {
  const entries = Object.entries(fetchQuery)
  for (let i = 0, ii = entries.length; i < ii; i++) {
    const [key, matcher] = entries[i]
    if (matcher) {
      if (typeof matcher === 'string' && isTmpId(matcher)) {
        return false
      } else if (matcher.$in) {
        const $in = sortUniqFilter(matcher.$in)
        if ($in.length === 0) {
          return false
        }
        fetchQuery[key] = { $in }
      }
    }
  }
  return fetchQuery
}

const isAllIdHit = (coll, query) => {
  const ids = _.get(query, [coll.idField, '$in'])
  if (!ids) return false
  const expire = coll.fetchMaxAge > 0 ? Date.now() - coll.fetchMaxAge : 0
  return _.every(ids, id => coll._byIdAts[id] > expire)
}

function doFetch(db, name, query, option) {
  const coll = db.getFetchData(name)
  if (!coll.onFetch) return undefined
  const notForce = !option.force
  if (option.force) {
    console.warn('fetch option.force will be deprecated soon. Please use invalidate')
  }

  // use getFetchQuery to modify final ajax call query
  let fetchQuery = normalizeQueryBasic(query, coll.idField)
  if (notForce && fetchQuery === false) return undefined
  fetchQuery = (coll.getFetchQuery || defaultGetFetchQuery)(fetchQuery, coll.idField, coll)
  if (notForce && fetchQuery === false) return undefined

  const fetchOption = _.omitBy(option, (v, k) => k[0] === '_')

  if (notForce && _.size(fetchOption) === 0 && isAllIdHit(coll, fetchQuery)) return undefined

  // use getFetchKey to stringify into querystring like key
  const fetchKey = (coll.getFetchKey || defaultGetFetchKey)(fetchQuery, option)
  if (notForce && fetchKey === false) return undefined
  option._fetchKey = fetchKey

  if (notForce) {
    // collection.fetchMaxAge: 1, // in seconds; null, 0 or -1 means no maxAge
    const now = Date.now()
    // console.log('>>>', fetchKey, fetchAts, fetchAts[fetchKey])
    if (coll.fetchMaxAge > 0 ? coll.fetchAts[fetchKey] > now - coll.fetchMaxAge : coll.fetchAts[fetchKey]) {
      if (option._keepFetchResult) return coll._fetchPromises[fetchKey] || coll._fetchResults[fetchKey]
      return false
    }
  }

  // doFetch
  coll.fetchAts[fetchKey] = Date.now()
  return markPromise(coll, fetchKey, () =>
    Promise.resolve(coll.onFetch(fetchQuery, option, coll)).then(res => {
      if (option._keepFetchResult) coll._fetchResults[fetchKey] = res
      db.load(name, res)
      return res
    })
  )
}

export default {
  fetch(name, query, option = {}) {
    option._keepFetchResult = true
    return doFetch(this, name, query, option)
  },

  get(name, id, option = {}) {
    doFetch(this, name, [id], option)
    return this.getById(name)[id]
  },
  pick(name, query, option = {}) {
    doFetch(this, name, query, option)
    return this.pickInMemory(name, query)
  },
  find(name, query, option = {}) {
    doFetch(this, name, query, option)
    return this.findInMemory(name, query)
  },
  pickAsync(name, query, option = {}) {
    return Promise.resolve(doFetch(this, name, query, option)).then(() => this.pickInMemory(name, query))
  },
  findAsync(name, query, option = {}) {
    return Promise.resolve(doFetch(this, name, query, option)).then(() => this.findInMemory(name, query))
  },
}
