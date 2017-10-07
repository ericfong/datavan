import _ from 'lodash'

import { getState, addMutation } from './base'

export const ALL = null
export const EXPIRED = 'EXPIRED'

function _omitAts(collection, atKey, ids) {
  let omitedIds
  if (ids === EXPIRED && !isNaN(collection.gcTime)) {
    const expired = Date.now() - collection.gcTime
    omitedIds = []
    collection[atKey] = _.reduce(
      collection[atKey],
      (newAts, at, id) => {
        const shouldKeep = at >= expired
        // console.log('>>>', atKey, id, shouldKeep)
        if (shouldKeep) {
          newAts[id] = at
        } else {
          omitedIds.push(id)
        }
        return newAts
      },
      {}
    )
  } else if (ids) {
    omitedIds = ids
    collection[atKey] = _.omit(collection[atKey], ids)
  } else {
    // ALL
    omitedIds = Object.keys(collection[atKey])
    collection[atKey] = {}
  }
  return omitedIds
}

function _invalidate(self, ids) {
  if (self.onFetch) {
    const delByIds = _omitAts(self, '_byIdAts', ids)
    // TODO only drop related fetchs
    const delFetchKeys = _omitAts(self, '_fetchAts', delByIds.length > 0 ? ALL : ids)
    getState(self).fetchAts = _.omit(getState(self).fetchAts, delFetchKeys)
    return { delByIds, delFetchKeys }
  }
  return { delByIds: [], delFetchKeys: [] }
}

export function invalidate(self, ids = EXPIRED, option) {
  _invalidate(self, ids)
  addMutation(self, null, option)
}

export function reset(self, ids = ALL, option) {
  const { delByIds, delFetchKeys } = _invalidate(self, ids)

  const byId = ids ? { $unset: delByIds } : { $set: {} }
  const fetchAts = ids ? { $unset: delFetchKeys } : { $set: {} }
  const originals = byId
  addMutation(self, { byId, fetchAts, originals }, option)
}

// reset will reset both dirty and tidy docs, garbageCollect only reset tidy docs
export function garbageCollect(self, ids = EXPIRED, option) {
  const { delByIds, delFetchKeys } = _invalidate(self, ids)
  const { byId: oldById, originals } = getState(self)
  const isTidy = id => !(id in originals)

  const byId = { $unset: _.filter(ids ? delByIds : Object.keys(oldById), isTidy) }
  const fetchAts = ids ? { $unset: delFetchKeys } : { $set: {} }
  addMutation(self, { byId, fetchAts }, option)
}

export function throttle(self, func, ids, option) {
  if (option && option.now) {
    func(self, ids, option)
  }
  if (self.gcTime >= 0) {
    const now = Date.now()
    const expire = now - self.gcTime
    if (!self._gcAt || self._gcAt <= expire) {
      self._gcAt = now
      func(self, ids, option)
    }
  }
}
