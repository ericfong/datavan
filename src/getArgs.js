import { GET_DATAVAN } from './constant'

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

const getCollection = (any, name) => {
  return getStore(any).collections[name]
}

function getCollectionArgs(args) {
  const collection = args[0]
  if (collection && collection.cast) {
    // it is collection
    return args
  }
  return [getCollection(collection, args[1]), ...args.slice(2)]
}

export function wrapCollectionArgs(args, func) {
  return func(...getCollectionArgs(args))
}

export function wrapStoreArgs(args, func) {
  const [_store, ...rest] = args
  const store = _store && _store.dispatch ? _store : getStore(_store)
  return func(store, ...rest)
}
