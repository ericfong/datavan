import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { TMP_ID_PREFIX } from './collection-util'

export const defaultGetFetchKey = (query, option) => stringify({ ..._.omitBy(option, (v, k) => k[0] === '_'), ...query })

// @auto-fold here
const markPromise = (db, name, key, promise) => {
  if (key !== undefined) return promise
  const { _fetchPromises } = db[name]
  const oldPromise = _fetchPromises[key]
  if (oldPromise) return oldPromise
  const markPromiseDone = () => {
    if (_fetchPromises[key] === promise) {
      delete _fetchPromises[key]
      if (Object.keys(_fetchPromises).length === 0) {
        db.mutateData(name, { $merge: { fetchingAt: undefined } })
      }
    }
  }
  promise
    .then(ret => {
      markPromiseDone()
      return ret
    })
    .catch(err => {
      markPromiseDone()
      return Promise.reject(err)
    })
  _fetchPromises[key] = promise
  // ensure fetchingAt is set to coll instantaneously
  const fetchingAt = Date.now()
  db[name].fetchingAt = fetchingAt
  db.mutateData(name, { $merge: { fetchingAt } })
  return promise
}

const isTmpId = id => !id || _.startsWith(id, TMP_ID_PREFIX)
const sortUniqFilter = ids => _.filter(_.sortedUniq(ids.sort()), id => !isTmpId(id))
// @auto-fold here
const prepareFetchQuery = (query, idField) => {
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

  const fetchQuery = prepareFetchQuery(query, coll.idField)
  const notForce = !option.force
  if (notForce && fetchQuery === false) return undefined
  if (notForce && isAllIdHit(coll, fetchQuery)) return undefined

  const fetchKey = (coll.getFetchKey || defaultGetFetchKey)(fetchQuery, option)
  if (notForce && fetchKey === false) return undefined
  option._fetchKey = fetchKey

  if (notForce) {
    // collection.fetchMaxAge: 1, // in seconds; null, 0 or -1 means no maxAge
    const now = Date.now()
    // console.log('>>>', fetchKey, fetchAts, fetchAts[fetchKey])
    if (coll.fetchMaxAge > 0 ? coll.fetchAts[fetchKey] > now - coll.fetchMaxAge : coll.fetchAts[fetchKey]) {
      return coll._fetchResults[fetchKey]
    }
  }

  // doFetch
  coll.fetchAts[fetchKey] = Date.now()
  const p = Promise.resolve(coll.onFetch(fetchQuery, option, coll)).then(res => {
    if (option._keepFetchResult) coll._fetchResults[fetchKey] = res
    db.load(name, res)
    return res
  })
  return markPromise(db, name, fetchKey, p)
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
