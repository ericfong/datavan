import _ from 'lodash'
import stringify from 'fast-stable-stringify'

export function calcQueryKey(query, option) {
  return stringify([query, _.pick(option, 'sort', 'skip', 'limit', 'keyBy', 'groupBy', 'map')])
}

export default function (self) {
  const { findData } = self

  let queryCacheById = null
  let queryCaches = {}

  function findMemory(query, option) {
    // reset cache or not
    const byId = self.getData()
    const shouldReset = byId !== queryCacheById
    queryCacheById = byId
    if (shouldReset) queryCaches = {}

    // return cache if exists
    const queryKey = calcQueryKey(query, option)
    // store queryKey for Fetcher
    option.queryKey = queryKey

    // HIT
    // console.log('findMemory', queryKey in queryCaches, queryKey)
    if (queryKey in queryCaches) {
      return queryCaches[queryKey]
    }

    // MISS
    return (queryCaches[queryKey] = findData(query, option))
  }

  Object.assign(self, {
    findMemory,
    find: findMemory,

    findMemoryOnly(query, option) {
      return queryCaches[calcQueryKey(query, option)]
    },
  })
}
