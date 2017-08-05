import _ from 'lodash'

import state from './state'
import defaults from './defaults'
import setter from './setter'
import submitter from './submitter'
import fetcher from './fetcher'

const Collection = Object.assign(state, setter, submitter, fetcher, defaults)

function applyOverride(self, override) {
  Object.assign(self, typeof override === 'function' ? override(self) : override)
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
