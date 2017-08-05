import _ from 'lodash'

import state from './state'
import defaults from './defaults'
import setter from './setter'
import submitter from './submitter'
import fetcher from './fetcher'

const Collection = Object.assign(state, setter, submitter, fetcher, defaults)

function applyOverride(self, override) {
  if (typeof override === 'function') {
    override(self)
  } else {
    Object.assign(self, override)
  }
  // _.each(override, (v, k) => {
  //   const baseFunc = self[k]
  //   if (typeof baseFunc === 'function') {
  //     self[k] = function overrideWrap(...args) {
  //       args.push(baseFunc.bind(this))
  //       return v.apply(this, args)
  //     }
  //   } else {
  //     self[k] = v
  //   }
  // })
}

function applyOverrides(self, _overrides) {
  if (Array.isArray(_overrides)) {
    const overrides = _.compact(_.flattenDeep(_overrides))
    _.each(overrides, override => applyOverride(self, override))
  } else {
    applyOverride(self, _overrides)
  }
}

export function define(props, override) {
  const Definition = Object.create(Collection)
  Object.assign(Definition, props)
  applyOverrides(Definition, override)
  return Definition
}

export default function create(props, override, Definition) {
  const self = Object.create(Definition || Collection)
  Object.assign(self, props)
  applyOverrides(self, override)
  self.init()
  return self
}
