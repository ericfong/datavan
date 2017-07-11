import _ from 'lodash'
import { createStore } from 'redux'

import { isClass, composeClass } from './util/classUtil'
import { mergeToStore } from './util/mutateUtil'
import SubmittingCollection from './SubmittingCollection'

const DV_MUTATE = 'DV_MUTATE'
// export const CONNECT_GET_STORE = 'CONNECT_GET_STORE'

// @auto-fold here
function dvReducer(state, action) {
  if (action.type === DV_MUTATE) {
    return mergeToStore(state, action.collections)
  }
  return state
}

export function defineCollection(...args) {
  return composeClass(...args, SubmittingCollection)
}

function createCollection(definition, name, preloadedState = {}, context) {
  let newObj
  if (!definition) {
    throw new Error(`Collection definition ${name} cannot be ${definition}`)
  }
  const _isClass = isClass(definition)
  if (!_isClass && typeof definition === 'function') {
    newObj = definition(preloadedState)
  } else {
    const Class = _isClass ? definition : defineCollection(definition)
    newObj = new Class(preloadedState)
  }

  Object.assign(newObj, {
    context,
    name,
    dependencies: [],
  })
  return newObj
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

export function createDatavanEnhancer(definitions) {
  return _createStore => (reducer, preloadedState = {}, enhancer) => {
    // create collections
    const context = {}
    const collections = _.mapValues(definitions, (definition, name) => createCollection(definition, name, preloadedState[name], context))

    // createStore
    const baseStore = _createStore(reducer ? (s, a) => dvReducer(reducer(s, a), a) : dvReducer, preloadedState, enhancer)

    // onChange & onChangeDebounce for inject to collection
    function onChange() {
      // console.time('onChange')
      baseStore.dispatch({ type: DV_MUTATE, collections })
      context.dispatchPromise = null
      // console.timeEnd('onChange')
    }
    function onChangeDebounce() {
      if (context.dispatchPromise) return context.dispatchPromise
      const curP = (context.dispatchPromise = new Promise(resolve =>
        setTimeout(() => {
          if (curP === context.dispatchPromise) onChange()
          resolve()
        })
      ))
      return curP
    }
    const passIntoCollections = { onChange, onChangeDebounce }
    _.each(collections, collection => {
      assignDependencies(collection, collections) // should after ALL collections created
      Object.assign(collection, passIntoCollections)
    })

    // new store object
    const newStore = {
      ...collections,

      ...baseStore,

      collections,
      context,
      setContext(newContext) {
        return Object.assign(context, newContext)
      },
    }
    return newStore
  }
}

export default function defineCollections(definitions) {
  return createDatavanEnhancer(definitions)(createStore)
}
