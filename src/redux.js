import _ from 'lodash'
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

export default function datavanEnhancer(ctx = {}) {
  if (typeof ctx === 'function') {
    console.warn(
      'Please use datavanEnhancer to create enhancer instead directly as enhancer. Use as \'createStore(reducer, state, datavanEnhancer({ overrides, context }))\' instead of \'createStore(reducer, state, datavanEnhancer)\''
    )
  }
  return _createStore => (_reducer, preloadedState, enhancer) => {
    // set default preload state
    const preload = _.defaultsDeep(preloadedState, { [STATE_NAMESPACE]: { _timestamp: Date.now() } })

    const finalReducer = _reducer ? (s, a) => rootReducer(_reducer(s, a), a) : rootReducer
    const store = _createStore(finalReducer, preload, enhancer)

    const { getState, dispatch } = store

    // create van
    Object.assign(store, {
      collections: {},
      vanCtx: { ...ctx.context, overrides: {}, ...ctx },
      // ctx = { overrides, dispatchWaitUntil }
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

    return store
  }
}
