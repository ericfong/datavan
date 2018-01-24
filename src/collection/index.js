// import _ from 'lodash'

import { TMP_ID_PREFIX } from '../constant'

export const _genTmpId = store => `${new Date().toISOString()}-${Math.random()}-${store.getState().datavan.system.byId.deviceName || 'tmp'}`

export const genId = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Deprecated! use genTmpId(store) instead of genId()')
  }
  return `${TMP_ID_PREFIX}${Date.now()}${Math.random()}`
}

const collectionPrototype = {
  idField: '_id',
  // gcTime: 60 * 1000,
  // cast: v => v,

  genId() {
    return _genTmpId(this.store)
  },

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

export default function createCollection(collectionConf, name, store) {
  if (process.env.NODE_ENV !== 'production') {
    if (collectionConf.getFetchKey) console.warn(`Deprecated! For ${name} collection. Please use getQueryString() instead of getFetchKey()`)
  }

  return {
    ...collectionPrototype,
    ...collectionConf,
    name,
    store,
    _memory: {},
    _fetchingPromises: {},
    _byIdAts: {},
  }
}
