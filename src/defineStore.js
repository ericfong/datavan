import _ from 'lodash'
import { createStore, compose } from 'redux'

import { isClass } from './util/classUtil'
import { mergeToStore } from './util/mutateUtil'

const DV_MUTATE = 'DV_MUTATE'
export const CONNECT_GET_STORE = 'CONNECT_GET_STORE'

// @auto-fold here
function dvReducer(state, action) {
  if (action.type === DV_MUTATE) {
    return mergeToStore(state, action.collections)
  }
  return state
}

// @auto-fold here
function createCollection(definition, name, preloadedState = {}, context) {
  let newObj
  if (!definition) {
    throw new Error(`Collection definition ${name} cannot be ${definition}`)
  }
  if (isClass(definition)) {
    newObj = new definition(preloadedState) // eslint-disable-line
  } else if (typeof definition === 'function') {
    newObj = definition(preloadedState)
    // } else if (Array.isArray(definition)) {
    //   newObj = new (composeClass(definition))
  } else {
    newObj = Object.create(definition)
    if (newObj.constructor) newObj.constructor(preloadedState)
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

export function collectionsEnhancer(definitions) {
  const { enhancers, ...collectionDefinitions } = definitions
  const ourEnhancer = _createStore => (reducer, preloadedState = {}, enhancer) => {
    // create collections
    const context = {}
    const collections = _.mapValues(collectionDefinitions, (definition, name) => createCollection(definition, name, preloadedState[name], context))

    // createStore
    const baseStore = _createStore(reducer ? (s, a) => dvReducer(reducer(s, a), a) : dvReducer, preloadedState, enhancer)

    // promise for debounce
    let dispatchPromise

    // onChange & onChangeDebounce for inject to collection
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
    const passIntoCollections = { onChange, onChangeDebounce }
    _.each(collections, collection => {
      assignDependencies(collection, collections) // should after ALL collections created
      Object.assign(collection, passIntoCollections)
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

      serverPreload(onOff) {
        context.serverPreloading = onOff !== false
      },

      invalidate() {
        _.each(collections, coll => {
          if (coll.invalidate) coll.invalidate()
        })
        onChange()
      },

      setContext(newContext) {
        Object.assign(context, newContext)
      },
    }
    return newStore
  }

  return enhancers && enhancers.length > 0 ? compose(...enhancers, ourEnhancer) : ourEnhancer
}

export default function defineCollections(definitions) {
  return collectionsEnhancer(definitions)(createStore)
}
