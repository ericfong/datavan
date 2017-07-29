import mutateUtil from 'immutability-helper'
import createDatavan from './createDatavan'

const DATAVAN = 'DATAVAN'

const collectAction = { type: DATAVAN }
export function collect(name) {
  // TODO gen uniq id to prevent use same global namespace
  const uniqId = Math.random()
  // TODO rename base on middle HOC
  return stateOrDispatch => {
    if (typeof stateOrDispatch === 'function') {
      // dispatch
      return stateOrDispatch(collectAction).getCollection(name, uniqId)
    }
    // state
    const readonly = true
    return stateOrDispatch.datavan().getCollection(name, uniqId, readonly)
  }
}

const DATAVAN_MUTATE = 'DATAVAN_MUTATE'

function reducer(state, action) {
  if (action.type === DATAVAN_MUTATE) {
    return mutateUtil(state, action.mutation)
  }
  return state
}

export default function createEnhancer(adapters) {
  return _createStore => (_reducer, preloadedState, enhancer) => {
    const finalReducer = _reducer ? (s, a) => reducer(_reducer(s, a), a) : reducer
    const store = _createStore(finalReducer, preloadedState || {}, enhancer)

    const { getState, dispatch } = store

    const datavanObj = createDatavan({
      getState,
      onChange: mutation => dispatch({ type: DATAVAN_MUTATE, mutation }),
      adapters,
    })
    const datavanFunc = () => datavanObj

    // inject store.datavan(name)
    store.datavan = datavanFunc

    // inject state.datavan(name)
    store.getState = function _getState() {
      const state = getState()
      state.datavan = datavanFunc
      return state
    }

    // inject dispatch
    store.dispatch = function _dispatch(action) {
      if (action.type === DATAVAN) {
        return datavanObj
      }
      return dispatch(action)
    }

    // const subscribe = store.subscribe
    // store.subscribe = function _subscribe(listener) {
    //   // context.duringMapState = true
    //   // // always set back to normal mode, if some find / queries set as serverPreloading
    //   // context.serverPreloading = false
    //   // context.duringMapState = false
    //   return subscribe(listener)
    // }

    return store
  }
}
