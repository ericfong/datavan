import _ from 'lodash'

import { getState, addMutation } from './base'

export const ALL = null
export const EXPIRED = 'EXPIRED'

// @auto-fold here
function calcUnset({ gcTime }, timestamps, ids) {
  if (ids === EXPIRED && gcTime > 0) {
    const unset = []
    const expired = Date.now() - gcTime
    _.each(timestamps, (timestamp, id) => {
      // console.log('>>>', timestamp - expired)
      if (timestamp <= expired) unset.push(id)
    })
    return unset
  }
  return Array.isArray(ids) ? ids : Object.keys(timestamps)
}

// @auto-fold here
function _invalidate(collection, ids) {
  if (collection.onFetch) {
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
