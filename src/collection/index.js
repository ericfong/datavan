import _ from 'lodash'

import { TMP_ID_PREFIX, getDeviceName } from '../definition'

// NOTE make tmpId sortable by time, so we use ISO Date
export const genTmpId = store => `${TMP_ID_PREFIX}${new Date().toISOString()}~${Math.random()}~${getDeviceName(store)}`

export const collectionDefaults = {
  idField: '_id',
  // gcTime: 60 * 1000,
  // cast: () => {},

  onInsert: () => {},

  genId() {
    return genTmpId(this.store)
  },

  getState() {
    return this.store.getState().datavan[this.name]
  },

  addMutation(mutation) {
    this.store.vanMutates.push({ collectionName: this.name, mutation })
  },
}

export const getAll = self => self.getState().byId

export const getOriginals = self => self.getState().originals

export const getSubmits = self => {
  const { byId, originals } = self.getState()
  return _.mapValues(originals, (v, k) => byId[k])
}

export function getPending(self) {
  const promises = Object.values(self._fetchingPromises)
  return promises.length <= 0 ? null : Promise.all(promises)
}
