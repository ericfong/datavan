import _ from 'lodash'

import { invalidate } from './submitter'
import { allPendings } from './fetcher'

export function setOverrides(store, _overrides) {
  return Object.assign(store.dv.overrides, _overrides)
}

export function invalidateStore(store, ids, option) {
  _.each(store.dv.collections, core => invalidate(core, ids, option))
}

export function storePending(store) {
  const { emitPromise, collections } = store.dv
  const promises = _.compact(_.flatMap(collections, allPendings))
  if (emitPromise) promises.push(emitPromise)
  if (promises.length <= 0) return null
  // TODO timeout or have a limit for recursive wait for promise
  return Promise.all(promises).then(() => storePending(store))
}

export function serverPreload(store, renderCallback) {
  const dv = store.dv
  dv.duringServerPreload = true

  const output = renderCallback()

  // recursive serverRender & promise.then
  const promise = storePending(store)
  if (promise) {
    return promise.then(() => serverPreload(store, renderCallback))
  }

  dv.duringServerPreload = false
  return output
}
