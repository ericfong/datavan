import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { GET_DATAVAN, DATAVAN_MUTATE } from './constant'
import initCollection from './collection'
import { load } from './collection/load'
import { dispatchMutations } from './store'

const defaultsPreload = (preloadedState, collections) => {
  const defaults = { datavan: {} }
  _.each(collections, (c, name) => {
    defaults.datavan[name] = { byId: {}, fetchAts: {}, originals: {} }
  })
  return _.defaultsDeep(preloadedState, defaults)
}

function castCollection(collection, newById, oldById) {
  return _.mapValues(newById, (doc, _id) => {
    if (doc === oldById[_id] || !doc || typeof doc !== 'object') return doc
    return collection.cast(doc) || doc
  })
}
function castCollections(collections, newDvState, oldDvState) {
  if (newDvState !== oldDvState) {
    _.each(collections, (collection, collName) => {
      if (!collection.cast) return
      const newCollState = newDvState[collName]
      const oldCollState = oldDvState[collName]
      if (newCollState === oldCollState || !newCollState) return
      const newById = newCollState.byId
      const oldById = oldCollState && oldCollState.byId
      if (newById === oldById) return
      newCollState.byId = castCollection(collection, newById, oldById || {})
    })
  }
}

export const datavanReducer = (state = {}) => state

export function createVanReducer(vanConf) {
  return (oldVanState = {}, action) => {
    if (action.type === DATAVAN_MUTATE) {
      action.vanReduced = true
      const { mutates } = action

      const newVanState = mutates.reduce((state, { collection, mutation }) => {
        const m = { [collection]: mutation || { _t: { $set: () => {} } } }
        return mutateUtil(state, m)
      }, oldVanState)

      castCollections(vanConf.collections, newVanState, oldVanState)

      return newVanState
    }
    return oldVanState
  }
}

export default function datavanEnhancer(vanConf) {
  const vanReducer = createVanReducer(vanConf)

  return _createStore => (reducer, preloadedState, enhancer) => {
    let reducerIsDuplicated = false
    const mutateReducer = (oldState, action) => {
      const newState = reducer(oldState, action)
      if (!reducerIsDuplicated && action.type === DATAVAN_MUTATE) {
        if (action.vanReduced) {
          reducerIsDuplicated = true
          return newState
        }
        return { ...newState, datavan: vanReducer(newState.datavan, action) }
      }
      return newState
    }

    const preload = defaultsPreload(preloadedState, vanConf.collections)

    const store = _createStore(mutateReducer, preload, enhancer)

    // injects
    const { getState, dispatch } = store
    const _getStore = () => store
    Object.assign(store, {
      collections: vanConf.collections,
      vanCtx: {
        ...vanConf,
        mutates: [],
      },
      getState() {
        const state = getState()
        state.datavan.get = _getStore
        return state
      },
      dispatch(action) {
        if (action.type === GET_DATAVAN) return store
        return dispatch(action)
      },
    })

    // init collections
    let isLoaded = false
    _.each(vanConf.collections, (collection, name) => {
      initCollection(collection, name, store)
      if (collection.initState) {
        // use load to normalize the initState or preloadedState
        load(collection, collection.initState)
        isLoaded = true
      }
    })
    // createCollection may load initState and generate some mutations
    if (isLoaded) dispatchMutations(store)

    return store
  }
}
