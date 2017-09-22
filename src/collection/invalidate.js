import _ from 'lodash'

import { getState, addMutation } from './base'

export const GC_GENERATION = 3

export const ALL = null
export const EXPIRED = 'EXPIRED'

function _omitAts(state, atKey, ids) {
  let omitedIds
  if (ids === EXPIRED) {
    omitedIds = []
    state[atKey] = _.reduce(
      state[atKey],
      (acc, at, id) => {
        at -= 1
        // console.log('>>>', atKey, at, id)
        const shouldBeOmit = at <= 0
        if (shouldBeOmit) {
          omitedIds.push(id)
        } else {
          acc[id] = at
        }
        return acc
      },
      {}
    )
  } else if (ids) {
    omitedIds = ids
    state[atKey] = _.omit(state[atKey], ids)
  } else {
    // ALL
    omitedIds = Object.keys(state[atKey])
    state[atKey] = {}
  }
  return omitedIds
}

export function _invalidate(self, ids) {
  if (self.onFetch) {
    const delByIds = _omitAts(self, '_byIdAts', ids)
    // TODO only drop related fetchs
    const delFetchKeys = _omitAts(getState(self), 'fetchAts', delByIds.length > 0 ? ALL : ids)
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
  if (option && option.force) {
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
