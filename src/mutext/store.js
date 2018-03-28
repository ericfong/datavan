import _ from 'lodash'

import createCollection from './collection'
import mutateCollection from './collection-mutate'

const reduce = (prevState, action) => {
  let totalMutation
  if (action.type === 'mutateData') {
    totalMutation = {
      [action.name]: action.args.reduceRight((ret, step) => ({ [step]: ret })),
    }
  }

  let nextState = prevState
  let hasChange = false
  _.mapValues(totalMutation, (mutation, name) => {
    const prev = prevState[name]
    const next = mutateCollection(prev, mutation)
    if (next !== prev) {
      if (!hasChange) {
        hasChange = true
        nextState = { ...prevState }
      }
      nextState[name] = next
    }
  })
  return nextState
}

const createStore = (confs, initState = {}) => {
  const store = {
    state: initState,
    getState: () => store.state,
    dispatch: action => {
      const prevState = store.getState()
      const nextState = reduce(prevState, action)
      if (nextState !== prevState) {
        store.state = nextState
        if (confs.onChange) confs.onChange(nextState)
      }
    },
  }
  _.each(confs, (conf, name) => {
    if (typeof conf === 'object') {
      initState[name] = createCollection(conf, name, store, initState[name])
    }
  })
  // console.log('>>>', store.getState().users)
  return store
}
export default createStore
