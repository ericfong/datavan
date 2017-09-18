import _ from 'lodash'

import { allPendings } from './collection/fetcher'
import { invalidate, garbageCollect, EXPIRED, ALL } from './collection/original'

export function setOverrides(store, _overrides) {
  return Object.assign(store.vanCtx.overrides, _overrides)
}

export function invalidateStore(store, option = {}) {
  _.each(store.collections, table => invalidate(table, option.all ? ALL : EXPIRED, option))
}

export function gcStore(store, option = {}) {
  _.each(store.collections, table => garbageCollect(table, option.all ? ALL : EXPIRED, option))
}

export function getStorePending(store) {
  const { vanCtx: { vanEmitting }, collections } = store
  const promises = _.compact(_.flatMap(collections, allPendings))
  if (vanEmitting) promises.push(vanEmitting)
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
