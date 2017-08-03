export createDatavan from './createDatavan'
export datavanEnhancer, { getCollection, defineCollection } from './enhancer'

export composeMixins from './util/composeMixins'

export serverPreload from './serverPreload'
export { setAdapters } from './store-setters'

export Browser from './plugins/Browser'
export Cookie from './plugins/Cookie'
export KoaCookie from './plugins/KoaCookie'
export Searchable, { search } from './plugins/Searchable'
export createStorage from './plugins/createStorage'
