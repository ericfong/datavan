import { GET_DATAVAN_ACTION, DATAVAN_MUTATE_ACTION } from './constant'

const getDatavanAction = { type: GET_DATAVAN_ACTION }

export function getStore(stateOrDispatch) {
  // stateOrDispatch = state
  const datavanState = stateOrDispatch.datavan
  if (datavanState) return datavanState.get()

  // stateOrDispatch = dispatch
  if (typeof stateOrDispatch === 'function') {
    return stateOrDispatch(getDatavanAction)
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
    vanCtx.onChangeTables[name] = true
  }

  return vanDb[name]
}

export function dispatchMutations(store) {
  const { vanMutates, vanDb } = store
  if (vanMutates.length > 0) {
    store.vanMutates = []
    store.dispatch({ type: DATAVAN_MUTATE_ACTION, mutates: vanMutates, vanDb })
  }
}
