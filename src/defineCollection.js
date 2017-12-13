import _ from 'lodash'

import createCollection, { applyPlugin } from './collection/createCollection'
import { getStore } from './store-base'

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
export const getCollection = (any, spec, creation) => _getCollection(getStore(any), spec, creation)

export const defineCollection = (name, _spec) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('defineCollection is deprecated! Please create all collections by createStore(reducer, preload, datavanEnhancer({ collections: ... }))')
  }
  const spec = typeof name === 'string' ? { name, ..._spec } : name
  const selector = stateOrDispatch => getCollection(stateOrDispatch, spec)
  selector.spec = spec
  return selector
}
