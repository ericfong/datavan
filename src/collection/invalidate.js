import _ from 'lodash'

import { getState, addMutation } from './base'

export const ALL = null
export const EXPIRED = 'EXPIRED'

function calcUnset(collection, timestamps, ids) {
  if (ids === EXPIRED) {
    const unset = []
    if (!isNaN(collection.gcTime)) {
      const expired = Date.now() - collection.gcTime
      _.each(timestamps, (timestamp, id) => {
        if (timestamp < expired) unset.push(id)
      })
    }
    return unset
  }
  return ids || Object.keys(timestamps)
}

function _invalidate(collection, ids) {
  if (collection.onFetch) {
    // const delByIds = _omitAts(collection, '_byIdAts', ids)
    const delByIds = calcUnset(collection, collection._byIdAts, ids)
    collection._byIdAts = _.omit(collection._byIdAts, delByIds)
    return {
      delByIds,
      // calc all dropping ids when del any byIds
      fetchAts: ids ? { $unset: calcUnset(collection, getState(collection).fetchAts, delByIds.length > 0 ? ALL : ids) } : { $set: {} },
    }
  }
  return { delByIds: [] }
}

export function invalidate(collection, ids = ALL) {
  const mutation = _invalidate(collection, ids)
  delete mutation.delByIds
  addMutation(collection, mutation)
}

// garbageCollect only reset tidy docs
export function garbageCollect(collection, ids = EXPIRED) {
  const { delByIds, fetchAts } = _invalidate(collection, ids)

  const { byId: oldById, originals } = getState(collection)
  const isTidy = id => !(id in originals)
  const byId = { $unset: _.filter(ids ? delByIds : Object.keys(oldById), isTidy) }
  addMutation(collection, { fetchAts, byId })
}

// reset both dirty and tidy docs
export function reset(collection, ids = ALL) {
  const { delByIds, fetchAts } = _invalidate(collection, ids)

  const byId = ids ? { $unset: delByIds } : { $set: {} }
  const originals = byId
  addMutation(collection, { fetchAts, byId, originals })
}

export function throttle(collection, func, ids, option) {
  if (option && option.now) {
    func(collection, ids, option)
  }
  if (collection.gcTime >= 0) {
    const now = Date.now()
    const expire = now - collection.gcTime
    if (!collection._gcAt || collection._gcAt <= expire) {
      collection._gcAt = now
      func(collection, ids, option)
    }
  }
}
