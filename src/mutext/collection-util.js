import _ from 'lodash'
import Mingo from 'mingo'

export const GET_DATAVAN_ACTION = 'DATAVAN'
export const DATAVAN_MUTATE_ACTION = 'DATAVAN_MUTATE'

export const TMP_ID_PREFIX = 'dv~'

export const tmpIdRegExp = /^dv~(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+Z)~([.\d]+)~(.+)/

export const getDeviceName = state => (state && state.deviceName) || 'tmp'

// NOTE query key with $$ prefix are omitted in query but send to fetcher
// export const startsWith$$ = (v, k) => _.startsWith(k, '$$')
// export const isInResponseQuery = query => _.some(query, startsWith$$)

export const genTmpId = deviceName => `${TMP_ID_PREFIX}${new Date().toISOString()}~${Math.random()}~${deviceName || ''}`

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

export const mingoQuery = query => new Mingo.Query(query)

export const mingoTester = query => {
  const mQuery = mingoQuery(query)
  return doc => mQuery.test(doc)
}

export const pickBy = (byId, query) => {
  if (typeof query === 'string' || Array.isArray(query)) return _.pick(byId, query)
  if (_.isEmpty(query)) return byId
  return _.pickBy(mingoTester(query))
}
