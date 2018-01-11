import _ from 'lodash'

import { TMP_ID_PREFIX } from '../constant'

const collectionPrototype = {
  idField: '_id',
  // gcTime: 60 * 1000,
  cast: v => v,
  genId: () => `${TMP_ID_PREFIX}${Date.now()}${Math.random()}`,

  getState() {
    return this.store.getState().datavan[this.name]
  },

  addMutation(mutation) {
    this.store.vanCtx.mutates.push({ collection: this.name, mutation })
  },

  getAll() {
    return this.getState().byId
  },
}

export const _getAll = collection => collection.getState().byId

export default function initCollection(collection, name, store) {
  _.defaults(collection, collectionPrototype)
  return Object.assign(collection, {
    name,
    store,
    _memory: {},
    _fetchingPromises: {},
    _byIdAts: {},
  })
}
