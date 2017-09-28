import _ from 'lodash'

import { GET_DATAVAN } from './redux'
import { createCollection } from './collection'

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

export function getCollection(store, spec, creation) {
  const { name, dependencies } = spec
  const { collections, vanCtx } = store
  let collection = collections[name]
  if (!collection && creation !== false) {
    // has dep.spec mean it is a defineCollection
    _.each(dependencies, dep => getCollection(store, dep.spec || dep))

    collection = collections[name] = createCollection({ ...spec, store }, vanCtx.overrides[name])
  }
  return collection
}

function collect(stateOrDispatch, spec) {
  return getCollection(getVan(stateOrDispatch), spec)
}

export const defineCollection = (_spec, oldSpec, dependencies) => {
  let spec = _spec
  if (typeof _spec === 'string') {
    spec = { name: _spec, dependencies, ...oldSpec }
  }
  const selector = stateOrDispatch => collect(stateOrDispatch, spec)
  selector.spec = spec
  return selector
}
