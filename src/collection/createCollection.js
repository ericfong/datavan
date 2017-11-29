import _ from 'lodash'

import { TMP_ID_PREFIX } from './util/idUtil'
import { init } from './load'
import * as base from './base'
import * as find from './find'
import * as setter from './setter'
import * as invalidate from './invalidate'
import * as submitter from './submitter'
import * as findExtra from './find-extra'
import httpFetcher from '../plug/httpFetcher'

const functions = {
  // __proxy__
  idField: '_id',
  // gcTime: 60 * 1000,
  // onInit, onLoad
  // findHook, filterHook, getHook, getAllHook, setAllHook
  cast: v => v,
  genId: () => `${TMP_ID_PREFIX}${Date.now()}${Math.random()}`,
}
_.each({ ...base, ...find }, (func, key) => {
  if (key[0] === '_' || functions[key]) return
  // eslint-disable-next-line
  functions[key] = function(...args) {
    return func(this, ...args) // eslint-disable-line
  }
})

_.each(
  {
    ...setter,
    ...findExtra,
    ...invalidate,
    ...submitter,
  },
  (func, key) => {
    if (key[0] === '_' || functions[key]) return
    // eslint-disable-next-line
    functions[key] = function(...args) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`Please use import { ${key} } from 'datavan' instead of collection.${key}()`)
      }
      return func(this, ...args) // eslint-disable-line
    }
  }
)

export const applyPlugin = (self, plugin) => (typeof plugin === 'function' ? plugin(self) : Object.assign(self, plugin))

export default function createCollection(spec) {
  if (process.env.NODE_ENV !== 'production' && spec.onMutate) {
    console.warn('Collection spec onMutate() function is removed. Please use onInit() or store.subscribe()')
  }

  let self = Object.assign({}, functions, spec)

  if (spec.plugin) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`${spec.name}.plugin is deprecated. Please use plugin({...spec})`)
    }
    self = applyPlugin(self, spec.plugin)
  }

  // if (plugin) self = applyPlugin(self, plugin)

  // TODO should use httpFetcher() explicitly in store.overrides / collection-enhancers / plugins
  if (self.onFetch) self = httpFetcher(self)(self)

  init(self)

  return self
}
