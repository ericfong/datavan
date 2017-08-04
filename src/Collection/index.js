import SyncDefaults from './SyncDefaults'
import SyncState from './SyncState'
import SyncFinder from './SyncFinder'
import SyncSetters from './SyncSetters'
import SyncMemory from './SyncMemory'

import AsyncDefaults from './AsyncDefaults'
import AsyncFetcher from './AsyncFetcher'
import AsyncState from './AsyncState'

import SyncInterface from './SyncInterface'

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

function fixMixin(mixin) {
  if (typeof mixin === 'function') return mixin
  return self => Object.assign(self, mixin)
}

export default function create(self, override, definition) {
  Collection(self)
  if (definition) {
    fixMixin(definition)(self)
  }
  if (override) {
    fixMixin(override)(self)
  }
  return self
}
