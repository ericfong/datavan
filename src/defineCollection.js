import _ from 'lodash'

import { GET_DATAVAN } from './constant'
import { createCollection } from './collection'

// global collection definitions
// export const collectionDefinitions = {}

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

export function _getCollection(store, spec, creation) {
  const { name, dependencies } = spec
  const { collections, vanCtx } = store
  let collection = collections[name]
  if (!collection && creation !== false) {
    // has dep.spec mean it is a defineCollection
    _.each(dependencies, dep => _getCollection(store, dep.spec || dep))

    collection = collections[name] = createCollection({ ...spec, store }, vanCtx.overrides[name])
  }
  return collection
}

export const defineCollection = (name, _spec, dependencies) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('\'defineCollection(name, spec, dependencies)\' is deprecated. Please use \'defineCollection(name, { ...spec, dependencies })\'')
  }

  let spec = name
  if (typeof name === 'string') {
    spec = { name, dependencies, ..._spec }
  }

  // NOTE in most case, collection definitions are global for one project, which make module define collection easier
  // collectionDefinitions[name] = spec

  const selector = stateOrDispatch => _getCollection(getVan(stateOrDispatch), spec)
  selector.spec = spec
  return selector
}

export function getCollection(store, spec, creation) {
  return _getCollection(store, typeof spec === 'string' ? { name: spec } : spec, creation)
}
