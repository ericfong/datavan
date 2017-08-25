import _ from 'lodash'
import { addMutation } from '../core/mutation'
import * as state from '../state'
import * as setter from '../setter'
import * as submitter from '../submitter'
import * as fetcher from '../fetcher'
import applyPlugins from '../core/applyPlugins'
import { calcQueryKey } from '../core/memory'
import { markMissIds } from '../core/finder'
import { withoutTmpId, TMP_ID_PREFIX } from '../core/idUtil'

function wrap(func) {
  // eslint-disable-next-line
  return function(...args) {
    // eslint-disable-next-line
    return func(this, ...args)
  }
}

const wrapAll = funcs => _.mapValues(funcs, wrap)

function calcFetchKey(fetchQuery, option) {
  if (fetchQuery === false) return false
  if (Array.isArray(fetchQuery) && fetchQuery.length === 1) return fetchQuery[0]
  return calcQueryKey(fetchQuery, option)
}

const Collection = Object.assign(
  {
    // conf,
    // override: dv.overrides[name],
    // name,
    // dv,
    // _pendingState: null,
    // _memory: {},
    // _fetchAts: {},
    // _fetchingPromises: {},

    // init state and _pendingState
    // apply plugins

    idField: '_id',

    onGetAll() {
      return this.getState().byId
    },

    onGet(id, option) {
      const data = this.onGetAll()
      if (this.onFetch) markMissIds(data, id, option)
      return data[id]
    },

    cast(v) {
      return v
    },

    genId() {
      return _.uniqueId(TMP_ID_PREFIX)
    },

    // onFind() {} : return result,
    // onSetAll(change, option) {},
    // onMutate() {},
    // onFetch() {},
    // onSubmit() {},

    getFetchQuery(query) {
      return withoutTmpId(query, this.idField)
    },

    getFetchKey(fetchQuery, option) {
      return calcFetchKey(fetchQuery, option)
    },
  },
  wrapAll({
    ...state,
    addMutation,
    ...setter,
    ...submitter,
    ...fetcher,
  })
)

export function define(props, override) {
  const Definition = Object.create(Collection)
  Object.assign(Definition, props)
  if (override) applyPlugins(override, Definition)
  return Definition
}

function init(core) {
  core._memory = {}
  core._fetchingPromises = {}
  const _fetchAts = (core._fetchAts = {})

  const collState = core.getState()
  const defaultState = { byId: {}, requests: {}, submits: {} }
  if (!collState) {
    core._pendingState = defaultState
  } else {
    core._pendingState = _.defaults({ ...collState }, defaultState)
  }

  const { byId, requests } = core._pendingState
  core._pendingState.byId = _.mapValues(byId, (v, id) => {
    _fetchAts[id] = 1
    return core.cast(v)
  })
  _.keys(requests).forEach(fetchKey => {
    _fetchAts[fetchKey] = 1
  })
}

export default function create(props, override, Definition) {
  const self = Object.create(Definition || Collection)
  Object.assign(self, props)
  if (override) applyPlugins(override, self)
  init(self)
  return self
}
