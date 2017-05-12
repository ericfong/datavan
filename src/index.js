import KeyValueStore from './KeyValueStore'
import Collection from './Collection'
import FetchingCollection from './FetchingCollection'
import SubmittingCollection from './SubmittingCollection'

import { composeClass, genGetSetters, mixinAccessor, isClass } from './util/classUtil'
import Searchable from './Searchable'

export defineStore, { collectionsEnhancer } from './defineStore'
export connect, { Provider } from './connect'
export { composeClass, genGetSetters, mixinAccessor, isClass, KeyValueStore, Collection, SubmittingCollection, FetchingCollection, Searchable }

export Browser from './Browser'
export LocalStorage, { SessionStorage } from './LocalStorage'
export Cookie from './Cookie'
export KoaCookie from './KoaCookie'

export function defineCollection(...args) {
  return composeClass(...args, SubmittingCollection)
}

export function defineKeyValues(conf, ...args) {
  return composeClass(mixinAccessor(conf), ...args, SubmittingCollection)
}
