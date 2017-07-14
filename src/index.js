import { composeClass } from './util/classUtil'
import SubmittingCollection from './SubmittingCollection'

export { composeClass, SubmittingCollection }

export ensureCollections, { defineCollection } from './ensureCollections'
export defineStore, { createDatavanEnhancer } from './defineStore'
export * from './store-functions'
export connect from './connect'
export connectDatavan, { withCollections } from './connect'
export { Provider } from 'react-redux'
export { getSetters } from './util/classUtil'

export KeyValueStore from './KeyValueStore'
export Collection from './Collection'
export FetchingCollection from './FetchingCollection'

// TODO datavan-browser
export Browser, { getBrowserWidth, getBrowserHeight } from './Browser'
export { LocalStorage, SessionStorage } from './LocalStorage'
export Cookie from './Cookie'

// TODO datavan-koa
export KoaCookie from './KoaCookie'

// TODO datavan-search
export Searchable, { search } from './Searchable'
