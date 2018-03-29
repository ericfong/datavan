import _ from 'lodash'

import createCollection from './collection'
import { mutateCollection } from './collection-mutate'

const reduce = (prevState, action) => {
  let totalMutation
  if (action.type === 'mutateData') {
    totalMutation = {
      [action.name]: action.args.reduceRight((ret, step) => ({ [step]: ret })),
    }
  }

  const change = {}
  _.mapValues(totalMutation, (mutation, name) => {
    const prev = prevState[name]
    const next = mutateCollection(prev, mutation)
    if (next !== prev) {
      change[name] = next
    }
  })
  return change
}

const createDb = (confs, initState) => {
  const state = {
    getState: () => state,
    dispatch: action => {
      const change = reduce(state, action)
      if (Object.keys(change).length > 0) {
        Object.assign(state, change)
        if (confs.onChange) confs.onChange(state, change)
      }
    },
    ...initState,
  }
  _.each(confs, (conf, name) => {
    if (typeof conf === 'object') {
      state[name] = createCollection(conf, name, state, state[name])
    }
  })
  return state
}
export default createDb
