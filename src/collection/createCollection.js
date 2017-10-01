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

const { getState, addMutation } = base

// @auto-fold here
function toMutation(change) {
  const mutation = {}
  _.each(change, (value, key) => {
    if (key === '$unset') {
      mutation.$unset = value
      return
    }
    mutation[key] = { $set: value }
  })
  return mutation
}

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

  setAll(change, option) {
    const mutation = { byId: toMutation(change) }

    if (this.onFetch) {
      // keep originals
      const mutOriginals = {}
      const { originals, byId } = getState(this)
      const keepOriginal = k => {
        if (!(k in originals)) {
          // need to convert undefined original to null, for persist
          const original = byId[k]
          mutOriginals[k] = { $set: original === undefined ? null : original }
        }
      }
      _.each(change, (value, key) => {
        if (key === '$unset') {
          _.each(value, keepOriginal)
          return
        }
        keepOriginal(key)
      })
      mutation.originals = mutOriginals
    }

    addMutation(this, mutation, option)
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
  if (key[0] === '_' || functions[key]) return
  // eslint-disable-next-line
  functions[key] = function(...args) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Please use import { ${key} } from 'datavan' instead of collection.${key}()`)
    }
    return func(this, ...args) // eslint-disable-line
  }
})

const applyPlugin = (self, plugin) => (typeof plugin === 'function' ? plugin(self) : Object.assign(self, plugin))

export default function createCollection(spec, plugin) {
  if (process.env.NODE_ENV !== 'production' && spec.onMutate) {
    console.warn('Collection spec onMutate() function is removed. Please use onInit() or store.subscribe()')
  }

  let self = Object.assign({}, functions, spec)

  if (spec.plugin) self = applyPlugin(self, spec.plugin)

  if (plugin) self = applyPlugin(self, plugin)

  // TODO should use httpFetcher() explicitly in store.overrides / collection-enhancers / plugins
  if (self.onFetch) self = httpFetcher(self)(self)

  init(self)

  return self
}
