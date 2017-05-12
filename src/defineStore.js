import _ from 'lodash'
import { createStore, compose } from 'redux'
import mutate from 'immutability-helper'

import { isClass } from './util/classUtil'
// import {composeClass} from './util/classUtil'

const MUTATE = 'MUTATE'
const REPLACE = 'REPLACE'
export const DELETE_FROM_STORE = 'DELETE_FROM_STORE'
export const CONNECT_GET_STORE = 'CONNECT_GET_STORE'

mutate.extend('$unset', function(keysToRemove, original) {
  var copy = Object.assign({}, original)
  for (const key of keysToRemove) delete copy[key]
  return copy
})

function reduceCollectionChanges(oldTable, changes, changingCtx) {
  if (Object.keys(changes).length === 0) return oldTable
  const newTable = Object.assign({}, oldTable)
  for (const key in changes) {
    const newValue = changes[key]
    const oldValue = newTable[key]
    if (oldValue !== newValue) {
      if (newValue === DELETE_FROM_STORE) {
        delete newTable[key]
      } else {
        newTable[key] = newValue
      }
      changingCtx.isChanged = true
    }
  }
  return newTable
}

function dbReducer(state, action) {
  if (action.type === MUTATE) {
    const allChanges = action.mutation
    if (!allChanges || Object.keys(allChanges).length === 0) return state
    const changingCtx = { isChanged: false }

    const newState = Object.assign({}, state)
    for (const collName in allChanges) {
      newState[collName] = reduceCollectionChanges(state[collName], allChanges[collName], changingCtx)
    }
    // console.log('dbReducer \n', state, '\n allChanges \n', allChanges, '\n>>>\n', newState)

    return changingCtx.isChanged ? newState : state
  } else if (action.type === REPLACE) {
    return action.state
  }
  return state
}

function createCollection(definition, name) {
  let newObj
  if (isClass(definition)) {
    // class
    newObj = new definition()
  } else if (typeof definition === 'function') {
    // factory
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
    // create collections and preloadStoreState
    const collections = _.mapValues(collectionDefinitions, (definition, name) => {
      const collection = createCollection(definition, name)

      // preload Store State
      if (!preloadedState[name]) {
        preloadedState[name] = {}
      }
      if (collection.preloadStoreState) {
        collection.preloadStoreState(preloadedState)
      }

      return collection
    })

    // createStore
    const _reducer = reducer ? (s, a) => dbReducer(reducer(s, a), a) : dbReducer
    const baseStore = _createStore(_reducer, preloadedState, enhancer)

    function dispatch(action) {
      // HACK to return whole store object for connect to get connections
      if (action.type === CONNECT_GET_STORE) {
        action.store = newStore
        return action
      }
      return baseStore.dispatch(action)
    }
    function mutateState(mutation) {
      dispatch({ type: MUTATE, mutation })
    }

    // context
    const ctx = {}
    function getContext() {
      return ctx
    }
    function setContext(data) {
      return _.merge(ctx, data)
    }

    function getPromise() {
      const promises = _.compact(_.map(collections, collection => collection.getPromise && collection.getPromise()))
      if (promises.length <= 0) return null
      return (
        Promise.all(promises)
          // TODO timeout or have a limit for recursive wait for promise
          .then(() => getPromise())
      )
    }

    // only expose few funcs, so collections will be less depend on store
    const _store = {
      getContext,
      // setContext,
      getState: baseStore.getState,
      mutateState,
    }
    _.each(collections, collection => {
      // inject store callback functions into slice
      collection._store = _store
      assignDependencies(collection, collections)
    })

    // new store object
    const newStore = {
      ...baseStore,
      dispatch,

      definitions,
      collections,

      getContext,
      setContext,
      getPromise,

      mutateState,

      serverRender(renderCallback) {
        setContext({ duringServerPreload: true })
        const output = renderCallback()

        // recursive renderCallback & promise.then (instead of recursive this.wait())
        const promise = this.getPromise()
        if (promise) {
          return promise.then(() => this.serverRender(renderCallback)).catch(err => {
            console.error(err)
          })
        }

        setContext({ duringServerPreload: false })
        return output
      },

      invalidate() {
        const newState = {}
        _.each(collections, (coll, name) => {
          if (coll.invalidate) {
            coll.invalidate()
            // TODO combine Fetcher * Stage to Remote
            newState[name] = {}
          }
        })
        // force the root state change
        dispatch({ type: REPLACE, state: newState })
      },
    }

    // HACK for people who directly access store
    // NOTE connect should use collections ONLY
    _.defaults(newStore, collections)

    return newStore
  }

  // run defined enhancers before preloadStoreState
  return enhancers && enhancers.length > 0 ? compose(...enhancers, ourEnhancer) : ourEnhancer
}

export default function defineCollections(definitions) {
  return collectionsEnhancer(definitions)(createStore)
}
