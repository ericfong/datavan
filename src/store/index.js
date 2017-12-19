import _ from 'lodash'

import { _allPendings } from '../collection/find'
import { invalidate, garbageCollect, EXPIRED, ALL } from '../collection/invalidate'

function throttle(collection, func, ids, option) {
  if (option && option.now) {
    func(collection, ids, option)
  }
  if (collection.gcTime >= 0) {
    const now = Date.now()
    const expire = now - collection.gcTime
    if (!collection._gcAt || collection._gcAt <= expire) {
      collection._gcAt = now
      func(collection, ids, option)
    }
  }
}

export function setOverrides(store, _overrides) {
  return Object.assign(store.vanCtx.overrides, _overrides)
}

export function invalidateStore(store, option = {}) {
  _.each(store.collections, coll => throttle(coll, invalidate, option.all ? ALL : EXPIRED, option))
}

export function gcStore(store, option = {}) {
  _.each(store.collections, coll => throttle(coll, garbageCollect, option.all ? ALL : EXPIRED, option))
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
