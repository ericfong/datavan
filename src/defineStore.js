import _ from 'lodash'
import { createStore, compose } from 'redux'

import { isClass } from './util/classUtil'
import { mergeToStore } from './util/mutateUtil'

const DV_MUTATE = 'DV_MUTATE'
export const CONNECT_GET_STORE = 'CONNECT_GET_STORE'

function dbReducer(state, action) {
  if (action.type === DV_MUTATE) {
    return mergeToStore(state, action.collections)
  }
  return state
}

function createCollection(definition, name) {
  let newObj
  if (isClass(definition)) {
    newObj = new definition() // eslint-disable-line
  } else if (typeof definition === 'function') {
    newObj = definition()
    // } else if (Array.isArray(definition)) {
    //   // assume if type of definition is array, it is a array of class mixins
    //   newObj = new (composeClass(definition))
  } else {
    newObj = Object.create(definition)
  }

  Object.assign(newObj, {
    name,
    dependencies: [],
  })
  return newObj
}

function assignDependencies(source, slices) {
  let requires = source.getRequires && source.getRequires()
  if (Array.isArray(requires)) {
    requires = _.keyBy(requires)
  }
  _.each(requires, (targetName, localName) => {
    const target = slices[targetName]
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

export function collectionsEnhancer(definitions) {
  const { enhancers, ...collectionDefinitions } = definitions
  const ourEnhancer = _createStore => (reducer, preloadedState = {}, enhancer) => {
    // create collections
    const collections = _.mapValues(collectionDefinitions, createCollection)

    // createStore
    const _reducer = reducer ? (s, a) => dbReducer(reducer(s, a), a) : dbReducer
    const baseStore = _createStore(_reducer, preloadedState, enhancer)

    // promise for debounce
    let dispatchPromise

    // things need to pass into collections
    const context = {}
    function onChange() {
      baseStore.dispatch({ type: DV_MUTATE, collections })
      dispatchPromise = null
    }
    function onChangeDebounce() {
      if (dispatchPromise) return dispatchPromise
      const curP = (dispatchPromise = new Promise(resolve =>
        setTimeout(() => {
          if (curP === dispatchPromise) onChange()
          resolve()
        })
      ))
      return curP
    }
    const passIntoCollections = { context, onChange, onChangeDebounce }

    _.each(collections, (collection, name) => {
      if (collection.importPreload) collection.importPreload(preloadedState[name] || {})

      // pass functions into collection
      Object.assign(collection, passIntoCollections)

      assignDependencies(collection, collections)
    })

    function getPromise() {
      const promises = _.compact(_.map(collections, collection => collection.getPromise && collection.getPromise()))
      if (dispatchPromise) promises.push(dispatchPromise)
      if (promises.length <= 0) return null
      // TODO timeout or have a limit for recursive wait for promise
      return Promise.all(promises).then(() => getPromise())
    }

    // new store object
    const newStore = {
      ...collections,
      ...baseStore,
      dispatch(action) {
        // HACK to return whole store object for connect to get connections
        if (action.type === CONNECT_GET_STORE) {
          action.store = newStore
          return action
        }
        return baseStore.dispatch(action)
      },

      definitions,

      context,
      getPromise,

      serverRender(renderCallback) {
        context.duringServerPreload = true

        const output = renderCallback()

        // recursive renderCallback & promise.then (instead of recursive this.wait())
        const promise = this.getPromise()
        if (promise) {
          return promise.then(() => this.serverRender(renderCallback)).catch(err => {
            console.error(err)
          })
        }

        context.duringServerPreload = false
        return output
      },

      invalidate() {
        _.each(collections, coll => {
          if (coll.invalidate) coll.invalidate()
        })
        onChange()
      },
    }
    return newStore
  }

  // run defined enhancers before importPreload
  return enhancers && enhancers.length > 0 ? compose(...enhancers, ourEnhancer) : ourEnhancer
}

export default function defineCollections(definitions) {
  return collectionsEnhancer(definitions)(createStore)
}
