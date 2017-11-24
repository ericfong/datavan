import _ from 'lodash'

import { GET_DATAVAN } from './constant'
import createCollection, { applyPlugin } from './collection/createCollection'

const GET_DATAVAN_ACTION = { type: GET_DATAVAN }
export function getVan(stateOrDispatch) {
  // stateOrDispatch = state
  const datavanState = stateOrDispatch.datavan
  if (datavanState) return datavanState.get()

  // stateOrDispatch = dispatch
  if (typeof stateOrDispatch === 'function') return stateOrDispatch(GET_DATAVAN_ACTION)

  // stateOrDispatch = store
  return stateOrDispatch
}

// only for internal use
export function _getCollection(store, _spec, creation) {
  let name
  let spec
  if (typeof _spec === 'string') {
    name = _spec
    spec = { name }
  } else {
    name = _spec.name
    spec = _spec
  }

  const { collections, vanCtx } = store
  let collection = collections[name]
  if (!collection && creation !== false) {
    spec = applyPlugin(spec, vanCtx.overrides[name])

    // has dep.spec mean it is a defineCollection
    _.each(spec.dependencies, dep => _getCollection(store, dep.spec || dep))

    collection = collections[name] = createCollection({ ...spec, store })
  }
  return collection
}

// only for extrenal use
export const getCollection = (any, spec, creation) => _getCollection(getVan(any), spec, creation)

export const defineCollection = (name, _spec) => {
  const spec = typeof name === 'string' ? { name, ..._spec } : name
  const selector = stateOrDispatch => getCollection(stateOrDispatch, spec)
  selector.spec = spec
  return selector
}
