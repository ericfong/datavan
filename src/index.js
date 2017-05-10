import KeyValueStore from './KeyValueStore'
import Collection from './Collection'
import FetchingCollection from './FetchingCollection'
import SubmittingCollection from './SubmittingCollection'

import { composeClass, genGetSetters, mixinAccessor } from './util/classUtil'
import Searchable from './Searchable'

export defineStore, { collectionsEnhancer } from './defineStore'
export connect, { Provider } from './connect'
export { composeClass, genGetSetters, mixinAccessor, KeyValueStore, Collection, SubmittingCollection, FetchingCollection, Searchable }

export Browser from './Browser'
// export LocalStorage from './LocalStorage'
export Cookie from './Cookie'

export function defineCollection(...args) {
  return composeClass(...args, SubmittingCollection)
}

export function defineKeyValues(conf) {
  return composeClass(mixinAccessor(conf), SubmittingCollection)
}
