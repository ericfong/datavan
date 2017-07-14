import { createStore } from 'redux'

import { mergeToStore } from './util/mutateUtil'
import ensureCollections from './ensureCollections'

const DV_MUTATE = 'DV_MUTATE'

const BENCHMARK = process.env.NODE_ENV !== 'production' && process.env.BENCHMARK

// @auto-fold here
function dvReducer(state, action) {
  if (action.type === DV_MUTATE) {
    return mergeToStore(state, action.collections)
  }
  return state
}

export function createDatavanEnhancer(definitions) {
  return _createStore => (reducer, preloadedState = {}, enhancer) => {
    const baseStore = _createStore(reducer ? (s, a) => dvReducer(reducer(s, a), a) : dvReducer, preloadedState, enhancer)

    const context = {}
    const collections = {}

    // onChange & onChangeDebounce for inject to collection
    function onChange() {
      if (BENCHMARK) console.time('BENCHMARK datavan dispatch collections changes')
      baseStore.dispatch({ type: DV_MUTATE, collections })
      context.dispatchPromise = null
      if (BENCHMARK) console.timeEnd('BENCHMARK datavan dispatch collections changes')
    }
    function onChangeDebounce() {
      if (context.dispatchPromise) return context.dispatchPromise
      const curP = (context.dispatchPromise = new Promise(resolve =>
        setTimeout(() => {
          if (curP === context.dispatchPromise) onChange()
          resolve()
        })
      ))
      return curP
    }

    // new store object
    const newStore = {
      ...collections,
      ...baseStore,
      context,
      setContext(newContext) {
        return Object.assign(context, newContext)
      },
      collections,
      onChangeDebounce,
      onChange,
    }

    if (definitions) ensureCollections(newStore, definitions)

    return newStore
  }
}

export const datavanEnhancer = createDatavanEnhancer()

export default function defineCollections(definitions) {
  return createDatavanEnhancer(definitions)(createStore)
}
