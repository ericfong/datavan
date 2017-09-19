import _ from 'lodash'

import { getState, addMutation } from './base'

// invalidate / reset / garbageCollect

export const ALL = null
export const EXPIRED = 'EXPIRED'

function _omitAts(self, atKey, ids) {
  let omitedIds
  if (ids === EXPIRED) {
    omitedIds = []
    if (self.onFetch && self.gcTime > 0) {
      const expire = Date.now() - self.gcTime
      self[atKey] = _.omitBy(self[atKey], (at, id) => {
        const shouldBeOmit = at <= expire
        if (shouldBeOmit) omitedIds.push(id)
        return shouldBeOmit
      })
    }
  } else if (ids) {
    omitedIds = ids
    self[atKey] = _.omit(self[atKey], ids)
  } else {
    omitedIds = Object.keys(self[atKey])
    self[atKey] = {}
  }
  return omitedIds
}

function _invalidate(self, ids) {
  const omitedGets = _omitAts(self, '_getAts', ids)
  const omitedFinds = _omitAts(self, '_findAts', omitedGets.length > 0 ? ALL : ids)
  return { omitedGets, omitedFinds }
}

export function invalidate(self, ids = EXPIRED, option) {
  _invalidate(self, ids)
  addMutation(self, null, option)
}

// reset will reset both dirty and tidy docs, garbageCollect only reset tidy docs
export function garbageCollect(self, ids = EXPIRED, option) {
  const { omitedGets, omitedFinds } = _invalidate(self, ids)
  const { byId: oldById, originals } = getState(self)
  const isTidy = id => !(id in originals)

  const byId = { $unset: _.filter(ids ? omitedGets : Object.keys(oldById), isTidy) }
  const requests = ids ? { $unset: omitedFinds } : { $set: {} }
  addMutation(self, { byId, requests, originals }, option)
}

export function reset(self, ids = ALL, option) {
  const { omitedGets, omitedFinds } = _invalidate(self, ids)

  const byId = ids ? { $unset: omitedGets } : { $set: {} }
  const requests = ids ? { $unset: omitedFinds } : { $set: {} }
  const originals = byId
  addMutation(self, { byId, requests, originals }, option)
}
