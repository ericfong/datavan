import _ from 'lodash'

import { invalidateFetchAt } from '../submitter'
import { getState } from '../state'
import { addMutation } from '../core/mutation'

function getGcInvalidateIds(table) {
  const expire = Date.now() - table.gcTime
  const invalidateIds = []
  _.each(table._fetchAts, (fetchAt, id) => {
    if (fetchAt <= expire) {
      invalidateIds.push(id)
    }
  })
  // console.log('getGcInvalidateIds', table._fetchAts, invalidateIds)
  return invalidateIds
}

export function gcTable(table, option) {
  if (!table.onFetch) return
  // check gcTime & expire
  if (!(table.gcTime >= 0)) return null
  const expire = Date.now() - table.gcTime
  if (table._gcAt > expire) return null
  table._gcAt = Date.now()

  // run gc: invalidate fetchAts
  const invalidateIds = getGcInvalidateIds(table)
  invalidateFetchAt(table, invalidateIds)

  // run gc: unset byId and requests
  const { byId, requests, originals } = getState(table)
  const byIdUnset = _.filter(invalidateIds || Object.keys(byId), id => !(id in originals))
  const requestUnset = _.filter(invalidateIds || Object.keys(requests), id => !(id in originals))
  const mut = { byId: { $unset: byIdUnset }, requests: { $unset: requestUnset } }
  addMutation(table, mut, option)

  return true
}
