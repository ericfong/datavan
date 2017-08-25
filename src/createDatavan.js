import _ from 'lodash'
import { takeMutation } from './core/mutation'

function Emitter(dv, onChange) {
  function emitFlush() {
    const m = _.pickBy(_.mapValues(dv.collections, coll => takeMutation(coll)))
    if (!_.isEmpty(m)) onChange(m)
    dv.emitPromise = null
  }
  return function emit(flush) {
    if (flush) return emitFlush()
    if (dv.emitPromise) return dv.emitPromise
    const curP = (dv.emitPromise = new Promise(resolve =>
      setTimeout(() => {
        if (curP === dv.emitPromise) emitFlush()
        resolve()
      })
    ))
    return curP
  }
}

export default function createDatavan({ getState, onChange, overrides = {} }) {
  const collections = {}
  const dv = { getState, onChange, overrides, collections }

  return Object.assign(dv, {
    emit: Emitter(dv, onChange),
  })
}
