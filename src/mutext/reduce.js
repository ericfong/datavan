import _ from 'lodash'
import mutateUtil from 'immutability-helper'

const reduce = (prevState, action) => {
  let totalMutation
  if (action.type === 'mutateData') {
    totalMutation = action.args.reduceRight((ret, step) => ({ [step]: ret }))
  }

  const changes = {}
  _.mapValues(totalMutation, (mutation, name) => {
    const prev = prevState[name]
    const next = mutateUtil(prev, mutation)
    if (next !== prev) {
      next.cache = {}
      changes[name] = next
    }
  })

  // console.log('reduce', prevState, totalMutation, changes)
  return changes
}

export default reduce
