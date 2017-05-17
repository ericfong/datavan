import _ from 'lodash'
import { createStore, compose } from 'redux'

import { isClass } from './util/classUtil'

const REPLACE = 'REPLACE'
export const DELETE_FROM_STORE = 'DELETE_FROM_STORE'
export const CONNECT_GET_STORE = 'CONNECT_GET_STORE'

function dbReducer(state, action) {
  if (action.type === REPLACE) {
    return action.state
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
    // create collections and fill preloadedState
    const collections = _.mapValues(collectionDefinitions, (definition, name) => {
      const collection = createCollection(definition, name)
      // preload Store State
      if (!preloadedState[name]) preloadedState[name] = {}
      if (collection.preloadStoreState) collection.preloadStoreState(preloadedState)
      return collection
    })

    // createStore
    const _reducer = reducer ? (s, a) => dbReducer(reducer(s, a), a) : dbReducer
    const baseStore = _createStore(_reducer, preloadedState, enhancer)

    // context
    const ctx = {}
    function getContext() {
      return ctx
    }
    function setContext(data) {
      return _.merge(ctx, data)
    }

    let newState
    let dispatchPromise
    function getCollectionsState() {
      return newState || baseStore.getState()
    }
    function replaceStoreState(state) {
      baseStore.dispatch({ type: REPLACE, state })
    }
    function dispatchNow() {
      replaceStoreState(getCollectionsState())
      dispatchPromise = null
    }

    // only expose few funcs, so collections will be less depend on store
    const _store = {
      getContext,
      getState: getCollectionsState,
      addChanges(allChanges) {
        if (!allChanges || Object.keys(allChanges).length === 0) return false
        newState = Object.assign({}, getCollectionsState())
        let hasChange = false

        for (const collName in allChanges) {
          const changes = allChanges[collName]
          if (!changes || Object.keys(changes).length === 0) continue
          const ourColl = (newState[collName] = Object.assign({}, newState[collName]))

          for (const key in changes) {
            const newValue = changes[key]
            const oldValue = ourColl[key]
            if (newValue === DELETE_FROM_STORE) {
              if (key in ourColl) {
                delete ourColl[key]
                hasChange = true
              }
            } else if (oldValue !== newValue) {
              ourColl[key] = newValue
              hasChange = true
            }
          }
        }

        return hasChange
      },
      dispatchNow,
      // TODO should use Promise to debounce
      dispatchDebounce() {
        if (dispatchPromise) return dispatchPromise
        const curP = (dispatchPromise = new Promise(resolve =>
          setTimeout(() => {
            if (curP === dispatchPromise) dispatchNow()
            resolve()
          })
        ))
      },
    }
    _.each(collections, collection => {
      // inject store callback functions into slice
      collection._store = _store
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
      collections,

      getContext,
      setContext,
      getPromise,

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
        newState = {}
        _.each(collections, (coll, name) => {
          if (coll.invalidate) {
            coll.invalidate()
            newState[name] = {}
          }
        })
        replaceStoreState(newState)
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
