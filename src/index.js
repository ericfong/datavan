import { composeClass } from './util/classUtil'
import SubmittingCollection from './SubmittingCollection'

export { composeClass, SubmittingCollection }

export defineStore, { createDatavanEnhancer, defineCollection } from './defineStore'
export connect from './connect'
export connectDatavan from './connect'
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
