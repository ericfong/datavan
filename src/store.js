import _ from 'lodash'

import { invalidate } from './submitter'
import { allPendings } from './fetcher'

export function setOverrides(store, _overrides) {
  return Object.assign(store.van.overrides, _overrides)
}

export function invalidateStore(store, ids, option) {
  _.each(store.van.collections, core => invalidate(core, ids, option))
}

export function getStorePending(store) {
  const { emitPromise, collections } = store.van
  const promises = _.compact(_.flatMap(collections, allPendings))
  if (emitPromise) promises.push(emitPromise)
  if (promises.length <= 0) return null
  // TODO timeout or have a limit for recursive wait for promise
  return Promise.all(promises).then(() => getStorePending(store))
}

export function serverPreload(store, renderCallback) {
  const van = store.van
  van.duringServerPreload = true

  const output = renderCallback()

  // recursive serverRender & promise.then
  const promise = getStorePending(store)
  if (promise) {
    return promise.then(() => serverPreload(store, renderCallback))
  }

  van.duringServerPreload = false
  return output
}
