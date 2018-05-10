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
      coll.getDb().dispatch(coll.name, { $merge: { fetchingAt: undefined } })
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
  coll.fetchingAt = fetchingAt
  coll.getDb().dispatch(coll.name, { $merge: { fetchingAt } })
  return promise
}

const isTmpId = id => !id || _.startsWith(id, TMP_ID_PREFIX)
const sortUniqFilter = ids => _.filter(_.sortedUniq(ids.sort()), id => !isTmpId(id))
// @auto-fold here
const defaultGetFetchQuery = (query, idField) => {
  if (!query) return query

  if (Array.isArray(query)) {
    const ids = sortUniqFilter(query)
    if (ids.length === 0) return false
    return { [idField]: { $in: ids } }
  }

  const fetchQuery = { ...query }
  const entries = Object.entries(query)
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
    } else if (key === idField) {
      // idField is falsy
      return false
    }
  }

  const idFieldStr = fetchQuery[idField]
  if (typeof idFieldStr === 'string') {
    fetchQuery[idField] = { $in: [idFieldStr] }
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

  // use getFetchQuery to modify final ajax call query
  const fetchQuery = (coll.getFetchQuery || defaultGetFetchQuery)(query, coll.idField)
  const notForce = !option.force
  if (notForce && fetchQuery === false) return undefined
  if (notForce && isAllIdHit(coll, fetchQuery)) return undefined

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
