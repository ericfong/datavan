import _ from 'lodash'
import { takeMutation } from './core/mutation'

function emitFlush(van) {
  const m = _.pickBy(_.mapValues(van.collections, coll => takeMutation(coll)))
  if (!_.isEmpty(m)) van.onChange(m)
  van.emitPromise = null
}

export function emit(van, flush) {
  if (flush) return emitFlush(van)
  const p = van.emitPromise
  if (p) return p

  const curP = (van.emitPromise = new Promise(resolve =>
    setTimeout(() => {
      if (curP === van.emitPromise) emitFlush(van)
      resolve()
    })
  ))
  return curP
}

export default function createVan({ getState, onChange, overrides = {} }) {
  return { getState, onChange, overrides, collections: {} }
}
