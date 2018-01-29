import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { GET_DATAVAN_ACTION, DATAVAN_MUTATE_ACTION } from './constant'
import { collectionDefaults } from './collection'
import { load } from './collection/load'
import { dispatchMutations } from './store'

function _prepareCast(mutatedDocs, mutatedColls, coll, collName, mutation) {
  // prepare cast by loop mutation.byId and mark [id] $toggle $merge
  if (coll.cast && mutation && mutation.byId) {
    _.each(mutation.byId, (v, id) => {
      if (id[0] === '$') {
        if (id === '$merge' || id === '$toggle') {
          _.each(v, (subV, subK) => _.set(mutatedDocs, [collName, subK], true))
        }
      } else {
        _.set(mutatedDocs, [collName, id], true)
      }
    })
    mutatedColls[collName] = coll
  }
}

function _doCast(mutatedDocs, mutatedColls, newVanState, oldVanState) {
  // cast mutated docs
  _.each(mutatedDocs, (byId, collName) => {
    const newCollById = newVanState[collName].byId
    const oldCollById = oldVanState[collName].byId
    if (newCollById !== oldCollById) {
      const coll = mutatedColls[collName]
      _.each(byId, (isMutated, id) => {
        const newDoc = newCollById[id]
        if (newDoc !== oldCollById[id] && newDoc && typeof newDoc === 'object') {
          coll.cast(newDoc)
        }
      })
    }
  })
}

export function createVanReducer() {
  return (oldVanState = {}, action) => {
    if (action.type === DATAVAN_MUTATE_ACTION) {
      action.vanReduced = true
      const { mutates } = action

      const mutatedDocs = {}
      const mutatedColls = {}

      const newVanState = mutates.reduce((state, { coll, mutation }) => {
        const collName = coll.name

        _prepareCast(mutatedDocs, mutatedColls, coll, collName, mutation)

        const m = { [collName]: mutation || { _t: { $set: () => {} } } }
        return mutateUtil(state, m)
      }, oldVanState)

      _doCast(mutatedDocs, mutatedColls, newVanState, oldVanState)

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
