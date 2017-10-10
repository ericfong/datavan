import _ from 'lodash'

import { GET_DATAVAN } from './constant'
import createCollection, { applyPlugin } from './collection/createCollection'

const GET_DATAVAN_ACTION = { type: GET_DATAVAN }
function getVan(stateOrDispatch) {
  // stateOrDispatch = state
  const datavanState = stateOrDispatch.datavan
  if (datavanState) return datavanState.get()

  // stateOrDispatch = dispatch
  if (typeof stateOrDispatch === 'function') return stateOrDispatch(GET_DATAVAN_ACTION)

  // stateOrDispatch = store
  return stateOrDispatch
}

export function _getCollection(store, _spec, creation) {
  const { name } = _spec
  const { collections, vanCtx } = store
  let collection = collections[name]
  if (!collection && creation !== false) {
    const spec = applyPlugin(_spec, vanCtx.overrides[name])

    // has dep.spec mean it is a defineCollection
    _.each(spec.dependencies, dep => _getCollection(store, dep.spec || dep))

    collection = collections[name] = createCollection({ ...spec, store })
  }
  return collection
}

export const defineCollection = (name, _spec) => {
  let spec = name
  if (typeof name === 'string') {
    spec = { name, ..._spec }
  }

  const selector = stateOrDispatch => _getCollection(getVan(stateOrDispatch), spec)
  selector.spec = spec
  return selector
}

export function getCollection(store, spec, creation) {
  return _getCollection(store, typeof spec === 'string' ? { name: spec } : spec, creation)
}
