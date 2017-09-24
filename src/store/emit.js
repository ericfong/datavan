import _ from 'lodash'
import { DATAVAN_MUTATE } from '../redux'

function takeMutation(coll) {
  let ret
  if (coll._pendingState) {
    ret = { $set: coll._pendingState }
    coll._pendingState = undefined
  }
  return ret
}

function dispatchEmit(store) {
  const mutation = _.pickBy(_.mapValues(store.collections, takeMutation))
  if (!_.isEmpty(mutation)) {
    store.dispatch({ type: DATAVAN_MUTATE, mutation })
  }
  store.vanCtx.vanEmitting = null
}

let _forceEmitFlush = false
export function forceEmitFlush(flush = true) {
  _forceEmitFlush = flush
}

export function emit(store, flush) {
  if (flush || _forceEmitFlush) return dispatchEmit(store)
  const { vanCtx } = store
  const p = vanCtx.vanEmitting
  if (p) return p

  const curP = new Promise(resolve => {
    setTimeout(() => {
      if (curP === vanCtx.vanEmitting) dispatchEmit(store)
      resolve()
    })
  })
  vanCtx.vanEmitting = curP
  return curP
}
