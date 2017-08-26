import _ from 'lodash'
import create from './core/create'
import { GET_DATAVAN, STATE_NAMESPACE } from './enhancer'

export function getTableFromVan(van, spec) {
  const { collections } = van
  const { name } = spec
  let collection = collections[name]
  if (!collection) {
    const override = van.overrides[name]
    const _spec = override ? override(spec) : spec

    _.each(_spec.dependencies, dep => getTableFromVan(van, dep))

    collection = collections[name] = create(_spec)
    collection.van = van
  }
  return collection
}

const GET_DATAVAN_ACTION = { type: GET_DATAVAN }
function getVan(stateOrDispatch) {
  // stateOrDispatch = state
  const datavanState = stateOrDispatch[STATE_NAMESPACE]
  if (datavanState) return datavanState.get()

  // stateOrDispatch = dispatch
  if (typeof stateOrDispatch === 'function') return stateOrDispatch(GET_DATAVAN_ACTION)

  // stateOrDispatch = van
  return stateOrDispatch
}

// shortcut for package export
export default function table(stateOrDispatch, spec) {
  return getTableFromVan(getVan(stateOrDispatch), spec)
}
