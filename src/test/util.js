import _ from 'lodash'
import { createStore } from 'redux'

import { datavanEnhancer, getCollection } from '../..'
import { getQueryIds } from '../collection/fetcher'

export const timeoutResolve = value => new Promise(resolve => resolve(value))

export const onFetchEcho = query =>
  timeoutResolve(_.map(getQueryIds(query, '_id'), _id => (_id ? { _id, name: _.toUpper(_id) } : undefined)))

export const echoValue = query =>
  timeoutResolve(_.mapValues(_.keyBy(getQueryIds(query, '_id')), id => _.toUpper(id)))

export function createCollection(spec = {}) {
  const name = spec.name || 'users'
  const collections = { [name]: spec }
  const store = createStore(s => s, {}, datavanEnhancer({ collections }))
  return getCollection(store, name)
}
