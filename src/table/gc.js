import _ from 'lodash'

import { invalidate, invalidateFetchAt } from '../submitter'
import { getState } from '../state'
import { addMutation } from '../core/mutation'

export const EXPIRED = 'EXPIRED'

function getExpiredIds(table) {
  if (!table.gcTime) return []
  const expire = Date.now() - table.gcTime
  const expiredIds = []
  _.each(table._fetchAts, (fetchAt, id) => {
    if (fetchAt <= expire) {
      expiredIds.push(id)
    }
  })
  // console.log('getExpiredIds', table._fetchAts, expiredIds)
  return expiredIds
}

export function invalidateAuto(table, ids = EXPIRED, option) {
  invalidate(table, ids === EXPIRED ? getExpiredIds(table) : ids, option)
}

function resetTidy(table, ids, option) {
  invalidateFetchAt(table, ids)
  const { byId, requests, originals } = getState(table)
  // reset will reset both dirty and tidy docs, resetTidy only reset tidy docs
  const isTidy = id => !(id in originals)
  const byIdUnset = _.filter(ids || Object.keys(byId), isTidy)
  const requestUnset = _.filter(ids || Object.keys(requests), isTidy)
  const mut = { byId: { $unset: byIdUnset }, requests: { $unset: requestUnset } }
  addMutation(table, mut, option)
}

export function resetTidyAuto(table, ids = EXPIRED, option) {
  resetTidy(table, ids === EXPIRED ? getExpiredIds(table) : ids, option)
}
// if (!table.onFetch) return
// // check gcTime & expire
// if (!(table.gcTime >= 0)) return null
// const expire = Date.now() - table.gcTime
// if (table._gcAt > expire) return null
// table._gcAt = Date.now()
