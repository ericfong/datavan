import _ from 'lodash'

import { invalidate } from '../submitter'

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

  // run gc
  const invalidateIds = getGcInvalidateIds(table)
  invalidate(table, invalidateIds, option)
  return true
}
