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

function Collection(collection) {
  const { onFetch } = collection

  if (onFetch) {
    AsyncDefaults(collection)
  }

  SyncState(collection)
  SyncDefaults(collection)
  SyncFinder(collection)

  if (onFetch) AsyncSubmit(collection)

  SyncSetters(collection)
  SyncMemory(collection)

  if (onFetch) {
    AsyncFetcher(collection)
  }

  SyncInterface(collection)
  return collection
}

export default function (collection, adapter) {
  if (typeof adapter === 'function') {
    return adapter(collection, Collection)
  }

  return Collection(_.defaults(collection, adapter))
}
