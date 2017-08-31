import _ from 'lodash'

import { GET_DATAVAN, STATE_NAMESPACE } from './redux'
import { markMissIds } from './core/finder'
import { withoutTmpId, TMP_ID_PREFIX } from './core/idUtil'
import { calcFetchKey } from './core/keyUtil'
import * as state from './state'
import * as setter from './setter'
import * as submitter from './submitter'
import * as fetcher from './fetcher'

const { getState, init } = state

const functions = {
  idField: '_id',
  // gcTime: 60 * 1000,
  onGetAll() {
    return getState(this).byId
  },
  onGet(id, option) {
    const data = this.onGetAll()
    if (this.onFetch) markMissIds(data, id, option)
    return data[id]
  },
  // onInit()
  // onFind() {} : return result,
  // onSetAll(change, option) {},                 // called on every set
  // onMutate(nextById, prevById, mutation) {},   // called ONLY on thing has mutated/changed
  // onFetch() {},
  // onSubmit() {},
  // onImport(table)
  getFetchQuery(query) {
    return withoutTmpId(query, this.idField)
  },
  getFetchKey: (fetchQuery, option) => calcFetchKey(fetchQuery, option),
  cast: v => v,
  genId: () => `${TMP_ID_PREFIX}${Date.now()}${Math.random()}`,
}
_.each({ ...state, ...setter, ...submitter, ...fetcher }, (func, key) => {
  if (key[0] === '_') return
  // eslint-disable-next-line
  functions[key] = function(...args) {
    return func(this, ...args) // eslint-disable-line
  }
})

const applyOverride = (spec, override) => (typeof plugin === 'function' ? override(spec) : Object.assign(spec, override))

export function createTable(props) {
  const core = Object.assign({}, functions, props)
  init(core)
  return core
}

const GET_DATAVAN_ACTION = { type: GET_DATAVAN }
function getVan(stateOrDispatch) {
  // stateOrDispatch = state
  const datavanState = stateOrDispatch[STATE_NAMESPACE]
  if (datavanState) return datavanState.get()

  // stateOrDispatch = dispatch
  if (typeof stateOrDispatch === 'function') return stateOrDispatch(GET_DATAVAN_ACTION)

  // stateOrDispatch = store
  return stateOrDispatch
}

export function getTableFromStore(store, spec) {
  const { name } = spec
  const { collections } = store
  let collection = collections[name]
  if (!collection) {
    const override = store.vanOverrides[name]
    const _spec = override ? applyOverride(spec, override) : spec

    // has dep.spec mean it is a selector
    _.each(_spec.dependencies, dep => getTableFromStore(store, dep.spec || dep))

    collection = collections[name] = createTable({ ..._spec, store })
  }
  return collection
}

// shortcut for package export
export function table(stateOrDispatch, spec) {
  return getTableFromStore(getVan(stateOrDispatch), spec)
}
export default table

export const defineCollection = (_spec, oldSpec, dependencies) => {
  let spec = _spec
  if (typeof _spec === 'string') {
    spec = { name: _spec, dependencies, ...oldSpec }
    // throw new Error(
    //   `Use defineCollection({ name: '${spec}' }) instead of efineCollection('${spec}'). Please use object as spec directly instead of defineCollection`
    // )
  }
  const selector = stateOrDispatch => table(stateOrDispatch, spec)
  selector.spec = spec
  return selector
}
