import prePostHook from './util/prePostHook'
import findInMemory from './findInMemory'

const _find = (collection, query = {}, option = {}) => findInMemory(collection, query, option)

export const find = prePostHook(_find, 'findHook')

export const findAsync = prePostHook(_find, 'findAsyncHook')
