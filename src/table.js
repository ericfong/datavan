import _ from 'lodash'
import create from './core/create'
import getVan from './core/getVan'

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

// shortcut for package export
export default function table(stateOrDispatch, spec) {
  return getTableFromVan(getVan(stateOrDispatch), spec)
}
