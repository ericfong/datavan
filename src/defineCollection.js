import _ from 'lodash'

import { GET_DATAVAN, STATE_NAMESPACE } from './redux'
import { createCollection } from './collection'

const GET_DATAVAN_ACTION = { type: GET_DATAVAN }
function getVan(stateOrDispatch) {
  // stateOrDispatch = state
  const datavanState = stateOrDispatch[STATE_NAMESPACE]
  if (datavanState) return datavanState.get()

  // stateOrDispatch = dispatch
  if (typeof stateOrDispatch === 'function') return stateOrDispatch(GET_DATAVAN_ACTION)

  // stateOrDispatch = store
  return stateOrDispatch
}

const applyOverride = (spec, override) => (typeof plugin === 'function' ? override(spec) : Object.assign(spec, override))

export function getCollection(store, spec, creation) {
  const { name } = spec
  const { collections } = store
  let collection = collections[name]
  if (!collection && creation !== false) {
    const override = store.vanCtx.overrides[name]
    const _spec = override ? applyOverride(spec, override) : spec

    // has dep.spec mean it is a selector
    _.each(_spec.dependencies, dep => getCollection(store, dep.spec || dep))

    collection = collections[name] = createCollection({ ..._spec, store })
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
