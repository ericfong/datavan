import _ from 'lodash'
import Mingo from 'mingo'

export const queryTester = query => {
  const mingoQuery = new Mingo.Query(query)
  return doc => doc && mingoQuery.test(doc)
}

export const pickBy = (byId, query) => {
  if (typeof query === 'string' || Array.isArray(query)) return _.pick(byId, query)
  if (_.isEmpty(query)) return byId
  return _.pickBy(byId, queryTester(query))
}

export const queryData = (coll, option) => {
  const state = coll.getState()
  let { byId, originals } = state
  if (option.inResponse && option.queryString) {
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

export const pickInMemory = (coll, query, option = {}) => pickBy(queryData(coll, option), query)
