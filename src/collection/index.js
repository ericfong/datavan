// import _ from 'lodash'

import { TMP_ID_PREFIX } from '../constant'

export const tmpIdRegExp = /^dv~(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+Z)~([.\d]+)~(.+)/

const getDeviceName = store => (store && store.getState().datavan.system.byId.deviceName) || 'tmp'

// NOTE make tmpId sortable by time, so we use ISO Date
export const _genTmpId = store => `${TMP_ID_PREFIX}${new Date().toISOString()}~${Math.random()}~${getDeviceName(store)}`

export const collectionDefaults = {
  idField: '_id',
  // gcTime: 60 * 1000,
  // cast: () => {},

  onInsert: () => {},

  genId() {
    return _genTmpId(this.store)
  },

  getState() {
    return this.store.getState().datavan[this.name]
  },

  addMutation(mutation) {
    this.store.vanMutates.push({ collectionName: this.name, mutation })
  },
}

export const _getAll = collection => collection.getState().byId
