import _ from 'lodash'

import { reset } from '../collection/reset'
import { load } from '../collection/load'
import { getCollection } from '../store'
import { _allPendings } from '../collection/getter'

export function loadCollections(store, inData, option = {}) {
  return _.mapValues(inData, (data, collectionName) => {
    if (collectionName[0] === '_') return data

    const collection = getCollection(store, collectionName)
    if (collection) {
      load(collection, data, option)
      return data
    }
  })
}

function throttle(collection, func, option) {
  if (option && option.now) {
    func(collection, option)
  }
  if (collection.gcTime >= 0) {
    const now = Date.now()
    const expire = now - collection.gcTime
    if (!collection._gcAt || collection._gcAt <= expire) {
      collection._gcAt = now
      func(collection, option)
    }
  }
}

export function resetStore(store, option = {}) {
  if (option.expired === undefined) option.expired = true
  // console.log(`>>`, option)
  _.each(store.collections, coll => throttle(coll, reset, option))
}

export function invalidateStore(store, option) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('invalidateStore() is deprecated! Use resetStore()')
  }
  resetStore(store, option)
}

export function gcStore(store, option = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('invalidateStore() is deprecated! Use resetStore()')
  }
  resetStore(store, option)
}

export function getStorePending(store) {
  const { collections } = store
  const promises = _.compact(_.flatMap(collections, _allPendings))
  if (promises.length <= 0) return null
  // TODO timeout or have a limit for recursive wait for promise
  return Promise.all(promises).then(() => getStorePending(store))
}

export function serverPreload(store, renderCallback) {
  const { vanCtx } = store
  vanCtx.duringServerPreload = true

  const output = renderCallback()

  // recursive serverRender & promise.then
  const promise = getStorePending(store)
  if (promise) {
    return promise.then(() => serverPreload(store, renderCallback))
  }

  vanCtx.duringServerPreload = false
  return output
}

export function getContext(store) {
  return store.vanCtx
}

export function setContext(store, newCtx) {
  return Object.assign(store.vanCtx, newCtx)
}
