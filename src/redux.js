import _ from 'lodash'
import mutateUtil from 'immutability-helper'

export const GET_DATAVAN = 'DATAVAN'
export const DATAVAN_MUTATE = 'DATAVAN_MUTATE'

export function datavanReducer(state = {}) {
  return state
}

// function doMutations(state, mutations) {
//   return _.reduce(mutations, (cur, mutation) => mutateUtil(cur, mutation), state)
// }

function rootReducer(state, action) {
  if (action.type === DATAVAN_MUTATE) {
    const prevState = state.datavan
    const nextState = mutateUtil(prevState, { $merge: action.collections })
    if (nextState !== prevState) {
      return { ...state, datavan: nextState }
    }
  }
  return state
}

export default function datavanEnhancer(ctx = {}) {
  if (process.env.NODE_ENV !== 'production' && ctx.context) {
    console.warn('Please use \'datavanEnhancer({ overrides, a, b })\' instead of \'datavanEnhancer({ overrides, context: { a, b } })\'')
  }
  return _createStore => (_reducer, preloadedState, enhancer) => {
    // set default preload state
    const preload = _.defaultsDeep(preloadedState, { datavan: { _timestamp: Date.now() } })

    const finalReducer = _reducer ? (s, a) => rootReducer(_reducer(s, a), a) : rootReducer
    const store = _createStore(finalReducer, preload, enhancer)

    const { getState, dispatch } = store

    // create van
    Object.assign(store, {
      collections: {},
      vanCtx: { ...ctx.context, overrides: {}, ...ctx },
      // ctx = { overrides }
    })

    store.getState = function _getState() {
      const state = getState()
      state.datavan.get = () => store
      return state
    }

    // inject dispatch
    store.dispatch = function _dispatch(action) {
      if (action.type === GET_DATAVAN) {
        return store
      }
      return dispatch(action)
    }

    return store
  }
}
