import _ from 'lodash'
import { createStore } from 'redux'

import { datavanEnhancer, getCollection } from '../..'
import { getQueryIds } from '../collection/fetcher'

export const timeoutResolve = (value, t = 10) => new Promise(resolve => setTimeout(() => resolve(value), t))

export const onFetchEcho = query =>
  timeoutResolve(
    _.map(getQueryIds(query, '_id'), _id => {
      return _id ? { _id, name: _.toUpper(_id) } : undefined
    })
  )

export const echoValue = query =>
  timeoutResolve(
    _.mapValues(_.keyBy(getQueryIds(query, '_id')), id => {
      return _.toUpper(id)
    })
  )

export function createCollection(spec = {}) {
  const name = spec.name || 'users'
  const collections = { [name]: spec }
  const store = createStore(s => s, {}, datavanEnhancer({ collections }))
  return getCollection(store, name)
}
