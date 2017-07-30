import _ from 'lodash'

import SyncDefaults from './SyncDefaults'
import SyncState from './SyncState'
import SyncFinder from './SyncFinder'
import SyncSetters from './SyncSetters'
import SyncMemory from './SyncMemory'

import AsyncDefaults from './AsyncDefaults'
import AsyncFetcher from './AsyncFetcher'
import AsyncSubmit from './AsyncSubmit'

import SyncInterface from './SyncInterface'

export default function (table, adapter) {
  const adapterType = typeof adapter
  if (adapterType === 'object') {
    _.defaults(table, adapter)
  }

  const { onFetch } = table

  if (onFetch) {
    AsyncDefaults(table)
  }

  SyncState(table)
  SyncDefaults(table)
  SyncFinder(table)

  if (onFetch) AsyncSubmit(table)

  SyncSetters(table)
  SyncMemory(table)

  if (onFetch) {
    AsyncFetcher(table)
  }

  if (adapterType === 'function') {
    adapter(table)
  }

  SyncInterface(table)

  return table
}
