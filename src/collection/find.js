import runHook from './util/runHook'
import findInMemory from './findInMemory'

export const find = (collection, query = {}, option = {}) => {
  return runHook(collection.findHook, findInMemory, collection, query, option)
}

export const findAsync = (collection, query = {}, option = {}) => {
  return runHook(collection.findAsyncHook, findInMemory, collection, query, option)
}
