import _ from 'lodash'
import mutateUtil from 'immutability-helper'

import { GET_DATAVAN, DATAVAN_MUTATE } from './constant'
import createCollection from './collection/createCollection'
import { dispatchMutations } from './store-base'

const defaultsPreload = (preloadedState, collections) => {
  const defaults = { datavan: { _timestamp: Date.now() } }
  _.each(collections, (c, name) => {
    defaults.datavan[name] = { byId: {}, fetchAts: {}, originals: {} }
  })
  return _.defaultsDeep(preloadedState, defaults)
}

// let mutateTime = 0
// let castTime = 0
// let castDefPropTime = 0
// const NS_PER_SEC = 1e9
// const calcNano = diff => diff[0] * NS_PER_SEC + diff[1]
// export const printTimes = () => {
//   console.log(`ratio=${_.round(mutateTime / castTime, 1)} ${_.round(
//     castDefPropTime / castTime,
//     2
//   )} mutateTime=${mutateTime} castTime=${castTime} castDefPropTime=${castDefPropTime}`)
// }

const castedKey = '__c'
const castedValue = () => {}
const ensureCasted = (obj, func) => {
  if (!obj || typeof obj !== 'object' || obj[castedKey]) return obj
  const newObj = func(obj) || obj
  // FIXME test it
  // const start1 = process.hrtime()
  Object.defineProperty(newObj, castedKey, { value: castedValue, enumerable: false })
  // castDefPropTime += calcNano(process.hrtime(start1))
  return newObj
}
const castById = (byId, collection) => _.mapValues(byId, doc => ensureCasted(doc, collection.cast))
const castCollections = (dvState, collections) => {
  ensureCasted(dvState, () => {
    _.each(dvState, (collState, name) => {
      const collection = collections[name]
      if (!collection) return
      ensureCasted(collState, () => {
        collState.byId = castById(collState.byId, collection)
        collState.originals = castById(collState.originals, collection)
      })
    })
  })
}

export default function datavanEnhancer(ctx = {}) {
  return _createStore => (reducer, preloadedState, enhancer) => {
    const collections = {}

    const mutateReducer = (_state, action) => {
      let newState = reducer(_state, action)
      if (action.type === DATAVAN_MUTATE) {
        // const start1 = process.hrtime()
        const { mutates } = action
        const oldDvState = newState.datavan
        const datavan = mutates.reduce((state, { collection, mutation }) => {
          const m = { [collection]: mutation || { _t: { $set: () => {} } } }
          return mutateUtil(state, m)
        }, oldDvState)
        newState = { ...newState, datavan }
        // mutateTime += calcNano(process.hrtime(start1))

        // const start2 = process.hrtime()
        castCollections(newState.datavan, collections)
        // castTime += calcNano(process.hrtime(start2))
      }
      return newState
    }

    if (process.env.NODE_ENV !== 'production') {
      if (ctx.overrides) console.warn('datavanEnhancer({ overrides }) is deprecated! Please use datavanEnhancer({ collections })')
      if (!ctx.collections) console.warn('Please register all collections during createStore')
    }

    const preload = defaultsPreload(preloadedState, ctx.collections)

    const store = _createStore(mutateReducer, preload, enhancer)

    // injects
    const { getState, dispatch } = store
    const _getStore = () => store
    Object.assign(store, {
      collections,
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
    _.each(ctx.collections, (spec, name) => {
      collections[name] = createCollection({ ...spec, name, store })
    })
    // createCollection may load initState and generate some mutations
    dispatchMutations(store)

    return store
  }
}

export const datavanReducer = (state = {}) => state
