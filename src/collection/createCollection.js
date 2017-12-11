import _ from 'lodash'

import { TMP_ID_PREFIX } from './util/idUtil'
import { init } from './load'
import * as base from './base'
import * as find from './find'
import * as setter from './setter'
import httpFetcher from './fetcher'

const functions = {
  // __proxy__
  idField: '_id',
  // gcTime: 60 * 1000,
  // onInit, onLoad
  // findHook, filterHook, getHook, getAllHook, setAllHook
  cast: v => v,
  genId: () => `${TMP_ID_PREFIX}${Date.now()}${Math.random()}`,
}
_.each(
  {
    ...base,
    ...find,
    ...setter,
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
  let self = Object.assign({}, functions, spec)

  if (self.onFetch) self = httpFetcher(self)

  init(self)

  return self
}
