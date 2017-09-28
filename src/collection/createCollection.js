import _ from 'lodash'

import { TMP_ID_PREFIX } from './util/idUtil'
import { init } from './load'
import * as base from './base'
import * as setter from './setter'
import * as invalidate from './invalidate'
import * as submitter from './submitter'
import * as findExtra from './find-extra'
import httpFetcher from '../plug/httpFetcher'
import findInMemory from './findInMemory'

const { getState } = base

const functions = {
  // __proxy__
  idField: '_id',
  // gcTime: 60 * 1000,
  // onInit(),
  // checkFetch(),
  // preFind()
  // postFind()
  cast: v => v,
  genId: () => `${TMP_ID_PREFIX}${Date.now()}${Math.random()}`,
  // onSetAll(change, option) {},                 // called on every set
  // onMutate(nextById, prevById, mutation) {},   // called ONLY on thing has mutated/changed

  // overridables
  getAll() {
    return getState(this).byId
  },
  onGet(id) {
    return this.getAll()[id]
  },
  get(id, option = {}) {
    return this.onGet(id, option)
  },
  find(query = {}, option = {}) {
    return findInMemory(this, query, option)
  },
}
// _.each({  }, (func, key) => {
//   if (key[0] === '_') return
//   // eslint-disable-next-line
//   functions[key] = function(...args) {
//     return func(this, ...args) // eslint-disable-line
//   }
// })
_.each({ ...base, ...setter, ...findExtra, ...invalidate, ...submitter }, (func, key) => {
  if (key[0] === '_') return
  // eslint-disable-next-line
  functions[key] = function(...args) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Please use import { ${key} } from 'datavan' instead of collection.${key}()`)
    }
    return func(this, ...args) // eslint-disable-line
  }
})

export default function createCollection(spec) {
  if (process.env.NODE_ENV !== 'production' && spec.onMutate) {
    console.warn('Collection spec onMutate() function is removed. Please use onInit() or store.subscribe()')
  }

  let self = Object.assign({}, functions, spec)

  // TODO should use httpFetcher() explicitly in store.overrides / collection-enhancers / plugins
  if (self.onFetch) self = httpFetcher(self)(self)

  init(self)

  return self
}
