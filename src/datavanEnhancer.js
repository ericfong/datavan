import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { GET_DATAVAN_ACTION, DATAVAN_MUTATE_ACTION } from './constant'
import { collectionDefaults } from './collection'
import { load } from './collection/load'
import { dispatchMutations } from './store'

// prepare cast by loop mutation.byId and mark [id] $toggle $merge
function loopMutatingIdTable(mutIds = {}, byId) {
  _.each(byId, (v, id) => {
    if (id[0] === '$') {
      if (id === '$merge' || id === '$toggle') {
        _.each(v, (subV, subId) => {
          mutIds[subId] = true
        })
      }
    } else {
      mutIds[id] = true
    }
  })
  return mutIds
}

function castMutatingDocs(mutatingIdTable, vanDb, newVanState, oldVanState) {
  _.each(mutatingIdTable, (idTable, collectionName) => {
    const newCollById = newVanState[collectionName].byId
    const oldCollById = oldVanState[collectionName].byId
    if (newCollById !== oldCollById) {
      const coll = vanDb[collectionName]
      _.each(idTable, (isMutating, id) => {
        const newDoc = newCollById[id]
        if (newDoc !== oldCollById[id] && newDoc) {
          // && typeof newDoc === 'object'
          newCollById[id] = coll.cast(newDoc) || newDoc
        }
      })
    }
  })
}

export function createVanReducer() {
  return (oldVanState = {}, action) => {
    if (action.type === DATAVAN_MUTATE_ACTION) {
      action.vanReduced = true
      const { mutates, vanDb } = action

      const mutatingIdTable = {}

      const newVanState = mutates.reduce((state, { collectionName, mutation }) => {
        if (mutation.byId && vanDb[collectionName].cast) {
          mutatingIdTable[collectionName] = loopMutatingIdTable(mutatingIdTable[collectionName], mutation.byId)
        }
        return mutateUtil(state, { [collectionName]: mutation })
      }, oldVanState)

      castMutatingDocs(mutatingIdTable, vanDb, newVanState, oldVanState)

      return newVanState
    }
    return oldVanState
  }
}

const assignCollectionDefault = (coll, name) => {
  coll = _.defaults(coll, collectionDefaults)
  coll.name = name
  // coll.onSet = coll.onSet || coll.cast || _.noop
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
        _directFetchs: {},
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
