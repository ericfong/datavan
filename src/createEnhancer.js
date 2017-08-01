import mutateUtil from 'immutability-helper'
import createDatavan from './createDatavan'

const GET_DATAVAN = 'DATAVAN'
const GET_DATAVAN_ACTION = { type: GET_DATAVAN }

function getDv(host) {
  // dispatch
  if (typeof host === 'function') return host(GET_DATAVAN_ACTION)
  // state
  const datavan = host.datavan
  if (datavan) return datavan()
  // collection | store
  return host.dv
}

export function defCollection(name, wrapper) {
  // gen uniq id to prevent use same global namespace
  const uniqId = Math.random()
  return host => getDv(host).getCollection(name, { uniqId, wrapper })
}

export function getCollection(host, name) {
  console.log(host)
  return getDv(host).getCollection(name)
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

    // inject store.datavan(name)
    store.dv = datavanObj

    // inject state.datavan(name)
    const datavanFunc = (name, ...args) => {
      if (typeof name === 'string') return datavanObj.getCollection(name, ...args)
      return datavanObj
    }
    store.getState = function _getState() {
      const state = getState()
      state.datavan = datavanFunc
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
