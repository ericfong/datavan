import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { GET_DATAVAN, DATAVAN_MUTATE } from './constant'
import createCollection from './collection'
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
    const collections = {}

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

        castCollections(newState.datavan, collections)
      }
      return newState
    }

    const preload = defaultsPreload(preloadedState, ctx.collections)

    const store = _createStore(mutateReducer, preload, enhancer)

    // injects
    const { getState, dispatch } = store
    const _getStore = () => store
    Object.assign(store, {
      collections,
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
    _.each(ctx.collections, (spec, name) => {
      collections[name] = createCollection({ ...spec, name, store })
    })
    // createCollection may load initState and generate some mutations
    dispatchMutations(store)

    return store
  }
}

export const datavanReducer = (state = {}) => state
