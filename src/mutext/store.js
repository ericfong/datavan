import _ from 'lodash'

import createCollection from './collection'
import mutateCollection from './collection-mutate'

const reduce = (prevState, action) => {
  let totalMutation
  if (action.type === 'mutateData') {
    totalMutation = action.args.reduceRight((ret, step) => ({ [step]: ret }))
  }

  const changes = {}
  _.mapValues(totalMutation, (mutation, name) => {
    const next = mutateCollection(prevState[name], mutation)
    if (next !== false) {
      changes[name] = next
    }
  })

  // console.log('reduce', prevState, totalMutation, changes)
  return changes
}

const createStore = (confs, initState = {}) => {
  const store = {
    state: initState,
    getState: () => store.state,
    dispatch: action => {
      const prev = store.getState()
      const next = reduce(prev, action)
      if (next !== prev) {
        store.state = next
        if (confs.onChange) confs.onChange(next)
      }
    },
  }
  _.each(confs, (conf, name) => {
    if (typeof conf === 'object') {
      initState[name] = createCollection(conf, name, store, initState[name])
    }
  })
  return store
}
export default createStore
