import mutateUtil from 'immutability-helper'

export const STATE_NAMESPACE = 'datavan'
export const GET_DATAVAN = 'DATAVAN'
export const DATAVAN_MUTATE = 'DATAVAN_MUTATE'

export function datavanReducer(state = {}) {
  return state
}

function rootReducer(state, action) {
  if (action.type === DATAVAN_MUTATE) {
    return mutateUtil(state, { [STATE_NAMESPACE]: action.mutation })
  }
  return state
}

export default function datavanEnhancer(_createStore) {
  return (_reducer, _preloadedState, enhancer) => {
    const preloadedState = _preloadedState || {}
    if (!preloadedState[STATE_NAMESPACE]) preloadedState[STATE_NAMESPACE] = {}

    const finalReducer = _reducer ? (s, a) => rootReducer(_reducer(s, a), a) : rootReducer
    const store = _createStore(finalReducer, preloadedState, enhancer)

    const { getState, dispatch } = store

    Object.assign(store, {
      collections: {},
      vanEmitting: null,
      vanOverrides: {},
      vanCtx: {},
    })

    store.getState = function _getState() {
      const state = getState()
      state[STATE_NAMESPACE].get = () => store
      return state
    }

    // inject dispatch
    store.dispatch = function _dispatch(action) {
      if (action.type === GET_DATAVAN) {
        return store
      }
      return dispatch(action)
    }

    // const subscribe = store.subscribe
    // store.subscribe = function _subscribe(listener) {
    //   // dv.duringMapState = true
    //   // dv.duringMapState = false
    //   return subscribe(listener)
    // }

    return store
  }
}
