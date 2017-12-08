import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { GET_DATAVAN, DATAVAN_MUTATE } from './constant'
import createCollection from './collection/createCollection'

const defaultsPreload = (preloadedState, collections) => {
  const defaults = { datavan: { _timestamp: Date.now() } }
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
  // TODO check performance of using Object.defineProperty
  // FIXME test it
  Object.defineProperty(newObj, castedKey, { value: castedValue, enumerable: false })
  return newObj
}
const castById = (byId, collection) => _.mapValues(byId, doc => ensureCasted(doc, collection.cast))
const castCollections = (dvState, collections) => {
  ensureCasted(dvState, () => {
    _.each(dvState, (collState, name) => {
      const collection = collections[name]
      if (!collection) return
      ensureCasted(collState, () => {
        collState.byId = castById(collState.byId, collection)
        collState.originals = castById(collState.originals, collection)
      })
    })
  })
}

export default function datavanEnhancer(ctx = {}) {
  return _createStore => (reducer, preloadedState, enhancer) => {
    const collections = {}

    const mutateReducer = (state, action) => {
      let newState = reducer(state, action)
      if (action.type === DATAVAN_MUTATE) {
        newState = {
          ...newState,
          datavan: mutateUtil(newState.datavan, action.mutation),
        }
      }
      castCollections(newState.datavan, collections)
      return newState
    }

    if (process.env.NODE_ENV !== 'production') {
      if (ctx.overrides) console.warn('datavanEnhancer({ overrides }) is deprecated! Please use datavanEnhancer({ collections })')
      if (!ctx.collections) console.warn('Please register all collections during createStore')
    }

    const preload = defaultsPreload(preloadedState, ctx.collections)

    const store = _createStore(mutateReducer, preload, enhancer)

    // init collections
    _.each(ctx.collections, (spec, name) => {
      collections[name] = createCollection({ ...spec, name, store })
    })

    // injects
    const { getState, dispatch } = store
    const _getStore = () => store
    return Object.assign(store, {
      collections,
      vanCtx: {
        ...ctx,
        overrides: ctx.overrides || {},
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
  }
}

export const datavanReducer = (state = {}) => state
