import _ from 'lodash'

import { getState, addMutation } from './base'

export function invalidateFetchAt(self, ids) {
  self._getAts = ids ? _.omit(self._getAts, ids) : {}
  self._findAts = ids ? _.omit(self._findAts, ids) : {}
}

export function isDirty(table, id) {
  return id in getState(table).originals
}

export function getSubmits(table) {
  const { byId, originals } = getState(table)
  return _.mapValues(originals, (v, k) => byId[k])
}

export function getOriginals(table) {
  return getState(table).originals
}

export function invalidate(table, ids, option) {
  invalidateFetchAt(table, ids)
  // NOTE invalidate should not flashing UI
  addMutation(table, null, option)
}

export function reset(table, ids, option) {
  invalidateFetchAt(table, ids)
  const mutSet = ids ? { $unset: ids } : { $set: {} }
  const mut = { byId: mutSet, requests: mutSet, originals: mutSet }
  addMutation(table, mut, option)
}

// One function to handle:
// ids = null | AUTO_EXPIRED | [array-of-ids-or-query]
// invalidate | resetTidy-only | reset all
