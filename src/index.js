import { composeClass } from './util/classUtil'
import SubmittingCollection from './SubmittingCollection'

export { composeClass, SubmittingCollection }

export defineStore, { collectionsEnhancer } from './defineStore'
export connect, { Provider } from './connect'
export { getSetters } from './util/classUtil'

export KeyValueStore from './KeyValueStore'
export Collection from './Collection'
export FetchingCollection from './FetchingCollection'

export function defineCollection(...args) {
  return composeClass(...args, SubmittingCollection)
}

// TODO datavan-browser
export Browser from './Browser'
export { LocalStorage, SessionStorage } from './LocalStorage'
export Cookie from './Cookie'

// TODO datavan-koa
export KoaCookie from './KoaCookie'

// TODO datavan-search
export Searchable from './Searchable'
