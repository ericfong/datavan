import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { GET_DATAVAN_ACTION, DATAVAN_MUTATE_ACTION } from './constant'
import { collectionDefaults } from './collection'
import { load } from './collection/load'
import { dispatchMutations } from './store'

function castCollection(collection, newById, oldById = {}) {
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
      const oldCollState = oldDvState ? oldDvState[collName] : undefined
      if (newCollState === oldCollState || !newCollState) return
      const newById = newCollState.byId
      const oldById = oldCollState ? oldCollState.byId : undefined
      if (newById === oldById || !newById) return
      newCollState.byId = castCollection(collection, newById, oldById)
    })
  }
}

export function createVanReducer({ collections }) {
  return (oldVanState = {}, action) => {
    if (action.type === DATAVAN_MUTATE_ACTION) {
      action.vanReduced = true
      const { mutates } = action

      const newVanState = mutates.reduce((state, { collection, mutation }) => {
        const m = { [collection]: mutation || { _t: { $set: () => {} } } }
        return mutateUtil(state, m)
      }, oldVanState)

      castCollections(collections, newVanState, oldVanState)

      return newVanState
      // } else if (loadActionTypes && _.includes(loadActionTypes, action.type)) {
      //   castCollections(collections, oldVanState)
    }
    return oldVanState
  }
}

const assignCollectionDefault = (coll, name) => {
  coll = _.defaults(coll, collectionDefaults)
  coll.name = name
  return coll
}

export default function datavanEnhancer(vanConf) {
  // define system collection
  if (!_.get(vanConf, ['collections', 'system'])) {
    _.set(vanConf, ['collections', 'system'], {})
  }

  // createCollection step 1: assign defaults
  const confCollections = _.mapValues(vanConf.collections, assignCollectionDefault)
  vanConf.collections = confCollections

  const vanReducer = createVanReducer(vanConf)

  return _createStore => (reducer, _preload, enhancer) => {
    let reducerIsDuplicated = false
    const mutateReducer = (oldState, action) => {
      const newState = reducer(oldState, action)
      if (!reducerIsDuplicated && action.type === DATAVAN_MUTATE_ACTION) {
        if (action.vanReduced) {
          reducerIsDuplicated = true
          return newState
        }
        return { ...newState, datavan: vanReducer(newState.datavan, action) }
      }
      return newState
    }

    // move out preload.datavan data
    const preloadDatavanData = (_preload && _preload.datavan) || {}
    const preload = {
      ..._preload,
      datavan: _.mapValues(confCollections, () => ({ byId: {}, fetchAts: {}, originals: {} })),
    }

    const store = _createStore(mutateReducer, preload, enhancer)

    // createCollection step 2: assign store and per-store-variables
    const vanDb = _.mapValues(confCollections, collectionConf => {
      return {
        ...collectionConf,
        // per store variables
        store,
        _memory: {},
        _fetchingPromises: {},
        _byIdAts: {},
      }
    })

    // injects
    const { getState, dispatch } = store
    const _getStore = () => store
    Object.assign(store, {
      vanDb,
      vanMutates: [],
      // vanConf is per enhancer, vanCtx is per store
      vanCtx: { ...vanConf },
      getState() {
        const state = getState()
        state.datavan.get = _getStore
        return state
      },
      dispatch(action) {
        if (action.type === GET_DATAVAN_ACTION) return store
        return dispatch(action)
      },
    })

    // init collections
    let isLoaded = false
    _.each(vanDb, (collection, name) => {
      // use load to normalize the initState or preloadedState
      if (load(collection, preloadDatavanData[name])) {
        isLoaded = true
      }
      if (load(collection, collection.initState)) {
        isLoaded = true
      }
    })
    // createCollection may load initState and generate some mutations
    if (isLoaded) dispatchMutations(store)

    return store
  }
}
