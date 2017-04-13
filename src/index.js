import KeyValueStore from './KeyValueStore'
import Collection from './Collection'
import Stage from './Stage'
import Fetcher from './Fetcher'

import {composeClass, genGetSetters, mixinAccessor} from './util/classUtil'
import Searchable from './Searchable'


export defineCollections, {collectionsEnhancer} from './defineCollections'
export connect, {Provider} from './connect'
export {composeClass, genGetSetters, mixinAccessor, KeyValueStore, Collection, Stage, Fetcher, Searchable}

export Browser from './Browser'
export LocalStorage from './LocalStorage'
export Cookie from './Cookie'


export function remoteCollection(...args) {
  return composeClass(
    ...args,
    Fetcher,
    Stage,
    Collection,
  )
}


export function keyValues(conf) {
  return mixinAccessor(conf)(KeyValueStore)
}
