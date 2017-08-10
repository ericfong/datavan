import mutateUtil from 'immutability-helper'
import createDatavan from './createDatavan'

export const GET_DATAVAN = 'DATAVAN'
const DATAVAN_MUTATE = 'DATAVAN_MUTATE'

export function datavanReducer(state = {} /* , action */) {
  // if (action.type === DATAVAN_MUTATE) {
  //   return mutateUtil(state, action.mutation)
  // }
  return state
}

export function createDatavanEnhancer({ namespace = 'datavan' } = {}) {
  function rootReducer(state, action) {
    if (action.type === DATAVAN_MUTATE) {
      return mutateUtil(state, { [namespace]: action.mutation })
    }
    return state
  }

  return _createStore => (_reducer, _preloadedState, enhancer) => {
    const preloadedState = _preloadedState || {}
    if (!preloadedState[namespace]) preloadedState[namespace] = {}

    const finalReducer = _reducer ? (s, a) => rootReducer(_reducer(s, a), a) : rootReducer
    const store = _createStore(finalReducer, preloadedState, enhancer)

    const { getState, dispatch } = store

    const datavanObj = createDatavan({
      getState() {
        return getState()[namespace]
      },
      onChange(mutation) {
        return dispatch({ type: DATAVAN_MUTATE, mutation })
      },
    })

    store.dv = datavanObj

    const datavanFunc = () => datavanObj

    store.getState = function _getState() {
      const state = getState()
      state[namespace].get = datavanFunc
      return state
    }

    // inject dispatch
    store.dispatch = function _dispatch(action) {
      if (action.type === GET_DATAVAN) {
        return datavanObj
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

const datavanEnhancer = createDatavanEnhancer()

export default datavanEnhancer
