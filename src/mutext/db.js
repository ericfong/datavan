import _ from 'lodash'

import collection from './collection'
import { mutateCollection } from './reduce'

export { collection }

const init = (state, collFuncs) => {
  state = Object.assign(
    _.defaults(state, {
      // my change
      submits: {},
      originals: {},
      fetchAts: {},
      // preload that may want to keep
      preloads: {},

      // cache
      fetchingAt: null,
      cache: {},
      _fetchPromises: {},
      _byIdAts: {},
    }),
    collFuncs
  )
  if (collFuncs.initState) {
    const mutations = state.load(collFuncs.initState, true)
    state = mutateCollection(state, mutations)
  }
  return state
}

export const createCollection = (conf, name, store, firstState) => {
  const collFuncs = collection(conf, name, store)
  return init(firstState, collFuncs)
}

const createDb = (vanProtos, store) => {
  const firstState = store.getState()
  _.each(vanProtos, (vanProto, name) => {
    firstState[name] = createCollection(vanProto, name, store, firstState[name])
  })
  firstState.dispatch = store.dispatch
  return firstState
}

export default createDb
