import _ from 'lodash'

import { INVALIDATE_ALL, INVALIDATE_EXPIRED } from '../constant'

// @auto-fold here
function calcUnset({ gcTime }, timestamps, ids, expired) {
  if (expired && gcTime > 0) {
    const unset = []
    const expiredAt = Date.now() - gcTime
    _.each(timestamps, (timestamp, id) => {
      if (timestamp <= expiredAt) unset.push(id)
    })
    return unset
  }
  return ids || Object.keys(timestamps)
}

// reset both dirty and tidy docs
export function reset(collection, { ids, expired = false, mutated = true } = {}) {
  // if (!collection.onFetch) return

  const delByIds = calcUnset(collection, collection._byIdAts, ids, expired)
  collection._byIdAts = _.omit(collection._byIdAts, delByIds)

  const mut = {}
  // if any change in byIds, clear all query cache
  if (delByIds.length > 0) {
    mut.fetchAts = { $set: {} }
  }

  // console.log(`>>> expired=${expired}, mutated=${mutated}`, delByIds)
  if (mutated) {
    if (expired) {
      const { originals } = collection.getState()
      const isTidy = id => !(id in originals)
      mut.byId = {
        $unset: _.filter(delByIds, isTidy),
      }
    } else {
      mut.byId = ids ? { $unset: delByIds } : { $set: {} }
      mut.originals = mut.byId
    }
  }
  collection.addMutation(mut)
}

export function _invalidate(collection, ids = INVALIDATE_ALL) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('invalidate() is deprecated! Use reset(state, "table", { resetById: false, resetOriginals: false })')
  }
  reset(collection, {
    ids,
    expired: ids === INVALIDATE_EXPIRED,
    mutated: false,
  })
}

// garbageCollect only reset tidy docs
export function _garbageCollect(collection, ids = INVALIDATE_EXPIRED) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('garbageCollect() is deprecated! Use reset(state, "table", { tidyOnly: 1 })')
  }
  reset(collection, {
    ids,
    expired: ids === INVALIDATE_EXPIRED,
    mutated: true,
  })
}
