import { GET_DATAVAN, DATAVAN_MUTATE } from './constant'

const GET_DATAVAN_ACTION = { type: GET_DATAVAN }

export function getStore(stateOrDispatch) {
  // stateOrDispatch = state
  const datavanState = stateOrDispatch.datavan
  if (datavanState) return datavanState.get()

  // stateOrDispatch = dispatch
  if (typeof stateOrDispatch === 'function') {
    return stateOrDispatch(GET_DATAVAN_ACTION)
  }

  // stateOrDispatch = store
  return stateOrDispatch
}

export const getCollection = (any, name) => {
  if (any && any.idField) return any
  const { vanDb, vanCtx } = getStore(any)
  if (process.env.NODE_ENV !== 'production' && !vanDb[name]) {
    console.error(`collection "${name}" not found`)
  }

  // ref to connectOnChange.js
  if (vanCtx.onChangeTables) {
    vanCtx.onChangeTables.push(name)
  }

  return vanDb[name]
}

export function dispatchMutations(store) {
  const { vanMutates } = store
  if (vanMutates.length > 0) {
    store.vanMutates = []
    store.dispatch({ type: DATAVAN_MUTATE, mutates: vanMutates })
  }
}
