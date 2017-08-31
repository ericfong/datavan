import _ from 'lodash'

import { invalidate } from './submitter'
import { allPendings } from './fetcher'
import { takeMutation } from './core/mutation'
import { DATAVAN_MUTATE } from './redux'
import { gcTable } from './table/gc'

export function setOverrides(store, _overrides) {
  return Object.assign(store.vanOverrides, _overrides)
}

export function invalidateStore(store, ids, option) {
  _.each(store.collections, core => invalidate(core, ids, option))
}

export function gcStore(store, option) {
  _.each(store.collections, table => gcTable(table, option))
}

const vanMutate = (store, mutation) => store.dispatch({ type: DATAVAN_MUTATE, mutation })
function emitFlush(store) {
  const m = _.pickBy(_.mapValues(store.collections, coll => takeMutation(coll)))
  if (!_.isEmpty(m)) vanMutate(store, m)
  store.vanEmitting = null
}

let _forceEmitFlush = false
export function forceEmitFlush(flush = true) {
  _forceEmitFlush = flush
}

export function emit(store, flush) {
  if (flush || _forceEmitFlush) return emitFlush(store)
  const p = store.vanEmitting
  if (p) return p

  const curP = (store.vanEmitting = new Promise(resolve =>
    setTimeout(() => {
      if (curP === store.vanEmitting) emitFlush(store)
      resolve()
    })
  ))
  return curP
}

export function getStorePending(store) {
  const { vanEmitting, collections } = store
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
