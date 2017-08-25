import _ from 'lodash'
import Collection, { define } from './Collection'
import getVan from './core/getVan'

export function getCollection(stateOrDispatch, spec) {
  const specType = typeof spec
  if (specType === 'string') {
    return getCollection(stateOrDispatch, { name: spec })
  }
  // if (specType === 'function') {
  //   return spec(stateOrDispatch)
  // }

  const van = getVan(stateOrDispatch)
  const { collections } = van

  const { name, dependencies } = spec
  let collection = collections[name]
  if (!collection) {
    // create dependencies
    _.each(dependencies, dependency => {
      // console.log('dependency >', dependency.spec.name)
      dependency(stateOrDispatch)
    })

    // createCollection
    // TODO prevent spec is simple { name: spec }
    collection = collections[name] = Collection({ dv: van, name }, van.overrides[name], spec)

    if (!van[name]) van[name] = collection
  }
  return collection
}

export default function defineCollection(name, _spec, dependencies) {
  // gen uniq id to prevent use same global namespace
  const spec = define({ name }, _spec)
  if (dependencies) {
    console.warn(`Please put dependencies into spec object instead of 3rd argument for defineCollection ${name}`)
    spec.dependencies = dependencies
  }
  const getter = stateOrDispatch => getCollection(getVan(stateOrDispatch), spec)
  getter.spec = spec
  return getter
}
