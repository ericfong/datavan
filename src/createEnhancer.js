import mutateUtil from 'immutability-helper'
import createDatavan from './createDatavan'

const DATAVAN = 'DATAVAN'

const collectAction = { type: DATAVAN }
function _getCollection(stateOrDispatch, name, uniqId) {
  // dispatch
  if (typeof stateOrDispatch === 'function') {
    return stateOrDispatch(collectAction).getCollection(name, uniqId)
  }
  // state or store
  const datavan = stateOrDispatch.datavan
  if (datavan) {
    return datavan().getCollection(name, uniqId)
  }
  // collection
  const dv = stateOrDispatch.dv
  if (dv) {
    return dv.getCollection(name, uniqId)
  }
}

export function getCollection(_host, _name) {
  if (typeof _host !== 'string') {
    return _getCollection(_host, _name)
  }

  // gen uniq id to prevent use same global namespace
  const name = _host
  const uniqId = Math.random()
  return host => _getCollection(host, name, uniqId)
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
    const datavanFunc = (name, ...args) => {
      if (typeof name === 'string') return datavanObj.getCollection(name, ...args)
      return datavanObj
    }

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
    //   // dv.duringMapState = true
    //   // dv.duringMapState = false
    //   return subscribe(listener)
    // }

    return store
  }
}
