export createDatavan from './createDatavan'
export datavanEnhancer, { getCollection, defineCollection } from './enhancer'

export composeMixins from './util/composeMixins'

export serverPreload from './serverPreload'
export { setMixins } from './store-setters'

export Browser from './mixins/Browser'
export Cookie from './mixins/Cookie'
export KoaCookie from './mixins/KoaCookie'
export Searchable, { search } from './mixins/Searchable'
export createStorage from './mixins/createStorage'
