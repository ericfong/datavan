import _ from 'lodash'

import SyncDefaults from './SyncDefaults'
import SyncState from './SyncState'
import SyncFinder from './SyncFinder'
import SyncSetters from './SyncSetters'
import SyncMemory from './SyncMemory'

import AsyncDefaults from './AsyncDefaults'
import AsyncFetcher from './AsyncFetcher'
import AsyncState from './AsyncState'

import SyncInterface from './SyncInterface'

import combineWrappers from '../util/combineWrappers'

function Collection(collection) {
  const { onFetch } = collection

  if (onFetch) {
    AsyncDefaults(collection)
  }

  SyncState(collection)
  SyncDefaults(collection)
  SyncFinder(collection)

  if (onFetch) AsyncState(collection)

  SyncSetters(collection)
  SyncMemory(collection)

  if (onFetch) {
    AsyncFetcher(collection)
  }

  SyncInterface(collection)
  return collection
}

export default function (collection, wrappers) {
  // if (typeof next === 'function') {
  //   return next(collection, Collection)
  // }
  // Collection(_.defaults(collection, next))

  return combineWrappers(wrappers)(collection, Collection)
}
