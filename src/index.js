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
