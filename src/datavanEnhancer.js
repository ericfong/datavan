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

const castedKey = '__c'
const castedValue = () => {}
const ensureCasted = (obj, func) => {
  if (!obj || typeof obj !== 'object' || obj[castedKey]) return obj
  const newObj = func(obj) || obj
  Object.defineProperty(newObj, castedKey, { value: castedValue, enumerable: false })
  return newObj
}
const castCollections = (dvState, collections) => {
  ensureCasted(dvState, () => {
    _.each(dvState, (collState, name) => {
      const collection = collections[name]
      if (!collection) return
      ensureCasted(collState, () => {
        collState.byId = _.mapValues(collState.byId, doc => ensureCasted(doc, collection.cast))
        collState.originals = _.mapValues(collState.originals, doc => ensureCasted(doc, collection.cast))
      })
    })
  })
}

export default function datavanEnhancer(ctx = {}) {
  return _createStore => (reducer, preloadedState, enhancer) => {
    const mutateReducer = (_state, action) => {
      let newState = reducer(_state, action)
      if (action.type === DATAVAN_MUTATE) {
        const { mutates } = action
        const oldDvState = newState.datavan
        const datavan = mutates.reduce((state, { collection, mutation }) => {
          const m = { [collection]: mutation || { _t: { $set: () => {} } } }
          return mutateUtil(state, m)
        }, oldDvState)
        newState = { ...newState, datavan }

        castCollections(newState.datavan, ctx.collections)
      }
      return newState
    }

    const preload = defaultsPreload(preloadedState, ctx.collections)

    const store = _createStore(mutateReducer, preload, enhancer)

    // injects
    const { getState, dispatch } = store
    const _getStore = () => store
    Object.assign(store, {
      collections: ctx.collections,
      vanCtx: {
        ...ctx,
        overrides: ctx.overrides || {},
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
    _.each(ctx.collections, (collection, name) => {
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

export const datavanReducer = (state = {}) => state
