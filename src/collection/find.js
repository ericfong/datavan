import { getAll } from '.'
import { findInMemory } from './findInMemory'
import { pickInMemory } from './query'
import { checkFetch, isPreloadSkip } from './fetcher'

export function get(collection, id, option = {}) {
  if (collection.onFetch && option.fetch !== false && !isPreloadSkip(collection, option)) {
    checkFetch(collection, [id], option)
  }
  if (process.env.NODE_ENV !== 'production' && option.fetch === false) {
    console.warn('find option.fetch === false is deprecating! Please use findInMemory')
  }
  return getAll(collection)[id]
}

export function find(collection, query = {}, option = {}) {
  if (collection.onFetch && option.fetch !== false && !isPreloadSkip(collection, option)) {
    checkFetch(collection, query, option)
  }
  if (process.env.NODE_ENV !== 'production' && option.fetch === false) {
    console.warn('find option.fetch === false is deprecating! Please use findInMemory')
  }
  return findInMemory(collection, query, option)
}

export function findAsync(collection, query = {}, option = {}) {
  if (collection.onFetch) {
    return Promise.resolve(checkFetch(collection, query, option)).then(() => {
      return findInMemory(collection, query, option)
    })
  }
  return findInMemory(collection, query, option)
}

export function findOne(core, query, option) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('findOne is deprecated! Please use find()[0]')
  }
  return find(core, query, { ...option, limit: 1 })[0]
}

export const pick = (coll, query, option = {}) => {
  if (coll.onFetch && !isPreloadSkip(coll, option)) {
    checkFetch(coll, query, option)
  }
  return pickInMemory(coll, query, option)
}

export const pickAsync = (coll, query, option = {}) => {
  return Promise.resolve(coll.onFetch && checkFetch(coll, query, option)).then(() => {
    return pickInMemory(coll, query, option)
  })
}
