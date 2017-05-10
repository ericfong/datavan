import KeyValueStore from './KeyValueStore'
import Collection from './Collection'
import Fetcher from './Fetcher'
import Submitter from './Submitter'

import { composeClass, genGetSetters, mixinAccessor } from './util/classUtil'
import Searchable from './Searchable'

export defineStore, { collectionsEnhancer } from './defineStore'
export connect, { Provider } from './connect'
export { composeClass, genGetSetters, mixinAccessor, KeyValueStore, Collection, Submitter, Fetcher, Searchable }

export Browser from './Browser'
export LocalStorage from './LocalStorage'
export Cookie from './Cookie'

export function defineCollection(...args) {
  return composeClass(...args, Submitter, Fetcher, Collection)
}

export function defineKeyValues(conf) {
  return composeClass(mixinAccessor(conf), Submitter, Fetcher, Collection)
}
