import { GET_DATAVAN, DATAVAN_MUTATE } from './constant'

const GET_DATAVAN_ACTION = { type: GET_DATAVAN }

export function getStore(stateOrDispatch) {
  // stateOrDispatch = state
  const datavanState = stateOrDispatch.datavan
  if (datavanState) return datavanState.get()

  // stateOrDispatch = dispatch
  if (typeof stateOrDispatch === 'function') return stateOrDispatch(GET_DATAVAN_ACTION)

  // stateOrDispatch = store
  return stateOrDispatch
}

export const getCollection = (any, name) => {
  const { collections } = getStore(any)
  if (process.env.NODE_ENV !== 'production' && !collections[name]) {
    console.error(`collection "${name}" not found`)
  }
  return collections[name]
}

export function dispatchMutations(store) {
  const { vanCtx } = store
  const { mutates } = vanCtx
  if (mutates.length > 0) {
    vanCtx.mutates = []
    store.dispatch({ type: DATAVAN_MUTATE, mutates })
  }
}
