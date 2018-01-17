import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { GET_DATAVAN, DATAVAN_MUTATE } from './constant'
import initCollection from './collection'
import { load } from './collection/load'
import { dispatchMutations } from './store'

const defaultsPreload = (preloadedState, collections) => {
  const defaults = { datavan: {} }
  _.each(collections, (c, name) => {
    defaults.datavan[name] = { byId: {}, fetchAts: {}, originals: {} }
  })
  return _.defaultsDeep(preloadedState, defaults)
}

function castCollection(collection, newById, oldById) {
  return _.mapValues(newById, (doc, _id) => {
    if (doc === oldById[_id] || !doc || typeof doc !== 'object') return doc
    return collection.cast(doc) || doc
  })
}
function castCollections(ctx, newDvState, oldDvState) {
  if (newDvState !== oldDvState) {
    _.each(ctx.collections, (collection, collName) => {
      if (!collection.cast) return
      const newCollState = newDvState[collName]
      const oldCollState = oldDvState[collName]
      if (newCollState === oldCollState || !newCollState) return
      const newById = newCollState.byId
      const oldById = oldCollState && oldCollState.byId
      if (newById === oldById) return
      newCollState.byId = castCollection(collection, newById, oldById || {})
    })
  }
}

export default function datavanEnhancer(ctx = {}) {
  return _createStore => (reducer, preloadedState, enhancer) => {
    const mutateReducer = (_state, action) => {
      let newState = reducer(_state, action)
      if (action.type === DATAVAN_MUTATE) {
        const { mutates } = action
        const oldDvState = newState.datavan

        const newDvState = mutates.reduce((state, { collection, mutation }) => {
          const m = { [collection]: mutation || { _t: { $set: () => {} } } }
          return mutateUtil(state, m)
        }, oldDvState)

        castCollections(ctx, newDvState, oldDvState)

        newState = { ...newState, datavan: newDvState }
      }
      return newState
    }

    const preload = defaultsPreload(preloadedState, ctx.collections)

    const store = _createStore(mutateReducer, preload, enhancer)

    // injects
    const { getState, dispatch } = store
    const _getStore = () => store
    Object.assign(store, {
      collections: ctx.collections,
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
    let isLoaded = false
    _.each(ctx.collections, (collection, name) => {
      initCollection(collection, name, store)
      if (collection.initState) {
        // use load to normalize the initState or preloadedState
        load(collection, collection.initState)
        isLoaded = true
      }
    })
    // createCollection may load initState and generate some mutations
    if (isLoaded) dispatchMutations(store)

    return store
  }
}

export const datavanReducer = (state = {}) => state
