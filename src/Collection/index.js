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

import composeMixins from '../util/composeMixins'

function Collection(self) {
  AsyncDefaults(self)

  SyncState(self)
  SyncDefaults(self)
  SyncFinder(self)

  AsyncState(self)

  SyncSetters(self)
  SyncMemory(self)

  AsyncFetcher(self)

  SyncInterface(self)
}

export default function (self, mixins) {
  // if (typeof next === 'function') {
  //   return next(collection, Collection)
  // }
  // Collection(_.defaults(collection, next))

  Collection(self)
  composeMixins(mixins)(self)
  return self
}
