import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { GET_DATAVAN, DATAVAN_MUTATE } from './constant'
import createCollection from './collection/createCollection'

// export const doMutations = (state, mutations) => _.reduce(mutations, (cur, mutation) => mutateUtil(cur, mutation), state)

function rootReducer(state, action) {
  if (action.type === DATAVAN_MUTATE) {
    return {
      ...state,
      datavan: mutateUtil(state.datavan, action.mutation),
    }
  }
  return state
}

const defaultsPreload = (preloadedState, collections) => {
  const defaults = { datavan: { _timestamp: Date.now() } }
  _.each(collections, (c, name) => {
    defaults.datavan[name] = { byId: {}, fetchAts: {}, originals: {} }
  })
  return _.defaultsDeep(preloadedState, defaults)
}

export default function datavanEnhancer(ctx = {}) {
  return _createStore => (_reducer, preloadedState, enhancer) => {
    const preload = defaultsPreload(preloadedState, ctx.collections)

    const reducer = _reducer ? (s, a) => rootReducer(_reducer(s, a), a) : rootReducer

    const store = _createStore(reducer, preload, enhancer)
    const { getState, dispatch } = store
    const _getStore = () => store

    // injects
    const collections = {}
    Object.assign(store, {
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

    if (process.env.NODE_ENV !== 'production') {
      if (ctx.overrides) console.warn('datavanEnhancer({ overrides }) is deprecated! Please use datavanEnhancer({ collections })')
      if (!ctx.collections) console.warn('Please register all collections during createStore')
    }

    // init collections
    _.each(ctx.collections, (spec, name) => {
      collections[name] = createCollection({ ...spec, name, store })
    })
    return store
  }
}

export const datavanReducer = (state = {}) => state
