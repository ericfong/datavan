import _ from 'lodash'
import { isClass, composeClass } from './util/classUtil'
import SubmittingCollection from './SubmittingCollection'

export function defineCollection(...args) {
  return composeClass(...args, SubmittingCollection)
}

function createCollection(definition, name, preloadedState = {}) {
  if (!definition) {
    throw new Error(`Collection definition ${name} cannot be ${definition}`)
  }
  let collection
  const _isClass = isClass(definition)
  if (!_isClass && typeof definition === 'function') {
    collection = definition(preloadedState)
  } else {
    const Class = _isClass ? definition : defineCollection(definition)
    collection = new Class(preloadedState)
  }
  collection.__definition = definition
  return collection
}

function isInstanceOfDefinition(collection, definition) {
  return collection && collection.__definition === definition
}

// @auto-fold here
function assignDependencies(source, collections) {
  let requires = source.getRequires ? source.getRequires() : source.requires
  if (Array.isArray(requires)) {
    requires = _.keyBy(requires)
  }
  _.each(requires, (targetName, localName) => {
    const target = collections[targetName]
    if (!target) {
      throw new Error(`Required Store Not Found: ${targetName}`)
    }
    if (target.dependencies.indexOf(source) >= 0) {
      throw new Error(`Circular Dependency: ${name} try to depend on ${targetName} which already depend on ${name}`)
    }
    source[localName] = target
    source.dependencies = source.dependencies.concat([target], target.dependencies)
  })
}

export default function ensureCollections(store, definitions) {
  const { context, collections, onChange, onChangeDebounce } = store
  const newColls = {}
  _.each(definitions, (definition, name) => {
    const curColl = store[name]
    if (curColl) {
      if (!isInstanceOfDefinition(curColl, definition)) {
        // console.log(curColl, definition)
        throw new Error(`Try to re-define collection: ${name}`)
      }
    } else {
      const state = store.getState()
      const collection = Object.assign(createCollection(definition, name, state && state[name]), {
        name,
        dependencies: [],
        context,
        onChange,
        onChangeDebounce,
      })
      newColls[name] = collection
      store[name] = collection
      collections[name] = collection
    }
  })
  // should after ALL newColls added into collections
  _.each(newColls, coll => assignDependencies(coll, collections))
}
