import { getAll } from '.'
import { findInMemory } from './findInMemory'
import { findRemote, isPreloadSkip } from './fetcher'

export function get(collection, id, option = {}) {
  if (collection.onFetch && option.fetch !== false && !isPreloadSkip(collection, option)) {
    findRemote(collection, [id], option)
  } else if (process.env.NODE_ENV !== 'production' && option.fetch === false) {
    console.warn('find option.fetch === false is deprecating! Please use findInMemory')
  }
  return getAll(collection)[id]
}

export function find(collection, query = {}, option = {}) {
  if (collection.onFetch && option.fetch !== false && !isPreloadSkip(collection, option)) {
    findRemote(collection, query, option)
  } else if (process.env.NODE_ENV !== 'production' && option.fetch === false) {
    console.warn('find option.fetch === false is deprecating! Please use findInMemory')
  }
  return findInMemory(collection, query, option)
}

export function findAsync(collection, query = {}, option = {}) {
  if (collection.onFetch) {
    return Promise.resolve(findRemote(collection, query, option)).then(() => {
      return findInMemory(collection, query, option)
    })
  }
  return findInMemory(collection, query, option)
}

export function findOne(core, query, option) {
  return find(core, query, { ...option, limit: 1 })[0]
}
