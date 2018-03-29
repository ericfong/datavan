import _ from 'lodash'
import Mingo from 'mingo'
import mutateUtil from 'immutability-helper'

export const GET_DATAVAN_ACTION = 'DATAVAN'
export const DATAVAN_MUTATE_ACTION = 'DATAVAN_MUTATE'

export const TMP_ID_PREFIX = 'dv~'

export const tmpIdRegExp = /^dv~(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+Z)~([.\d]+)~(.+)/

export const getDeviceName = state => (state && state.deviceName) || 'tmp'

// NOTE query key with $$ prefix are omitted in query but send to fetcher
// export const startsWith$$ = (v, k) => _.startsWith(k, '$$')
// export const isInResponseQuery = query => _.some(query, startsWith$$)

export const genTmpId = deviceName => `${TMP_ID_PREFIX}${new Date().toISOString()}~${Math.random()}~${deviceName || ''}`

export const mingoQuery = query => new Mingo.Query(query)

export const mingoTester = query => {
  const mQuery = mingoQuery(query)
  return doc => doc && mQuery.test(doc)
}

export const pickBy = (byId, query) => {
  if (typeof query === 'string' || Array.isArray(query)) return _.pick(byId, query)
  if (!query) return byId
  return _.pickBy(byId, mingoTester(query))
}

export const filter = (byId, query) => {
  if (!query) return _.values(byId)
  return _.filter(byId, mingoTester(query))
}

// @auto-fold here prepare cast by loop mutation.byId and mark [id] $toggle $merge
const checkCast = (coll, nextById, prevById, id) => {
  const nextDoc = nextById[id]
  if (nextDoc !== prevById[id] && nextDoc) {
    nextById[id] = coll.cast(nextDoc) || nextDoc
  }
}
// @auto-fold
const checkCastById = (space, next, prev, mutation) => {
  const nextById = next[space]
  const prevById = prev[space]
  if (nextById === prevById) return
  _.each(mutation[space], (v, id) => {
    if (id[0] === '$') {
      if (id === '$merge' || id === '$toggle') {
        _.each(v, (subV, subId) => checkCast(next, nextById, prevById, subId))
      }
    } else {
      checkCast(next, nextById, prevById, id)
    }
  })
}
export const mutateCollection = (prev, mutation) => {
  if (Array.isArray(mutation)) {
    return mutation.reduce((r, m) => mutateCollection(r, m), prev)
  }

  const next = mutateUtil(prev, mutation)
  if (next !== prev) {
    next.cache = {}

    if (next.cast) {
      checkCastById('submits', next, prev, mutation)
      checkCastById('preloads', next, prev, mutation)
    }

    return next
  }
  return next
}

export const buildIndex = (docs, fields, isUnique) => {
  fields = Array.isArray(fields) ? fields : [fields]
  const field = fields[0]
  if (fields.length === 1) {
    return isUnique ? _.keyBy(docs, field) : _.groupBy(docs, field)
  }
  const restSteps = fields.slice(1)
  const groups = _.groupBy(docs, field)
  return _.mapValues(groups, groupDocs => buildIndex(groupDocs, restSteps, isUnique))
}
