import _ from 'lodash'
import { DATAVAN_MUTATE } from '../redux'

function takeMutation(table) {
  let ret
  if (table._pendingState) {
    ret = { $set: table._pendingState }
    table._pendingState = undefined
  }
  return ret
}
const vanMutate = (store, mutation) => store.dispatch({ type: DATAVAN_MUTATE, mutation })
function emitFlush(store) {
  const m = _.pickBy(_.mapValues(store.collections, takeMutation))
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
