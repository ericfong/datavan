import _ from 'lodash'
import Mingo from 'mingo'

const has$$ = (v, k) => _.startsWith(k, '$$')

// NOTE query key with $$ prefix are omitted in query but send to fetcher
export const newMingoQuery = query => new Mingo.Query(_.omitBy(query, has$$))

export const queryTester = query => {
  const mingoQuery = newMingoQuery(query)
  return doc => mingoQuery.test(doc)
}

export const pickBy = (byId, query) => {
  if (typeof query === 'string' || Array.isArray(query)) return _.pick(byId, query)
  if (_.isEmpty(query)) return byId
  return _.pickBy(byId, queryTester(query))
}

export const queryData = (coll, query, option) => {
  const state = coll.getState()
  let { byId, originals } = state
  const inResponse = option.queryString && ('inResponse' in option ? option.inResponse : _.some(query, has$$))
  if (inResponse) {
    const res = coll._inResponses[option.queryString]
    if (res) {
      byId = res.byId || res
      originals = res.byId ? res.originals : null
    }
  }
  if (option.inOriginal) {
    byId = _.omitBy({ ...byId, ...originals }, v => v === null)
  }
  return byId
}

export const pickInMemory = (coll, query, option = {}) => pickBy(queryData(coll, query, option), query)
