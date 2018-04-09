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

export const getAll = coll => coll.getState().byId

export const getOriginals = coll => coll.getState().originals

export function getPending(coll) {
  const promises = Object.values(coll._fetchingPromises)
  return promises.length <= 0 ? null : Promise.all(promises)
}

export const memorize = (coll, memoryKey, func) => {
  const state = coll.getState()
  // reset _memory by checking _memoryById
  if (coll._memoryById !== state) coll._memory = {}
  coll._memoryById = state
  const _memory = coll._memory

  // HIT
  if (memoryKey in _memory) return _memory[memoryKey]
  // MISS
  const ret = (_memory[memoryKey] = func(state))
  return ret
}

export const getSubmits = coll => memorize(coll, 'getSubmits', ({ byId, originals }) => _.mapValues(originals, (v, k) => byId[k]))
