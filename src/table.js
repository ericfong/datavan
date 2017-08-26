import _ from 'lodash'
import create from './core/create'
import { GET_DATAVAN, STATE_NAMESPACE } from './redux'

export function getTableFromStore(store, spec) {
  const { collections } = store
  const { name } = spec
  let collection = collections[name]
  if (!collection) {
    const override = store.vanOverrides[name]
    const _spec = override ? override(spec) : spec

    _.each(_spec.dependencies, dep => getTableFromStore(store, dep))

    collection = collections[name] = create(_spec)
    collection.store = store
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

  // stateOrDispatch = store
  return stateOrDispatch
}

// shortcut for package export
export default function table(stateOrDispatch, spec) {
  return getTableFromStore(getVan(stateOrDispatch), spec)
}
