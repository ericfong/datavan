// import _ from 'lodash'

import { TMP_ID_PREFIX } from '../constant'

export const tmpIdRegExp = /^dv=(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+Z)\/(\d+)\/(.+)/

export const _genTmpId = store =>
  `${TMP_ID_PREFIX}${new Date().toISOString()}/${Math.random()
    .toString()
    .substr(2)}/${store.getState().datavan.system.byId.deviceName || ''}`

const collectionPrototype = {
  idField: '_id',
  // gcTime: 60 * 1000,
  // cast: v => v,

  onInsert: v => v,

  genId() {
    return _genTmpId(this.store)
  },

  getState() {
    return this.store.getState().datavan[this.name]
  },

  addMutation(mutation) {
    this.store.vanMutates.push({ collection: this.name, mutation })
  },

  getAll() {
    return this.getState().byId
  },
}

export const _getAll = collection => collection.getState().byId

export default function createCollection(collectionConf, name, store) {
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
