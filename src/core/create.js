import _ from 'lodash'

import * as state from '../state'
import * as setter from '../setter'
import * as submitter from '../submitter'
import * as fetcher from '../fetcher'

import { addMutation } from './mutation'
import { markMissIds } from './finder'
import { withoutTmpId, TMP_ID_PREFIX } from './idUtil'
import { calcFetchKey } from './keyUtil'

const { getState } = state

const functions = {
  idField: '_id',
  onGetAll() {
    return getState(this).byId
  },
  onGet(id, option) {
    const data = this.onGetAll()
    if (this.onFetch) markMissIds(data, id, option)
    return data[id]
  },
  // onFind() {} : return result,
  // onSetAll(change, option) {},
  // onMutate() {},
  // onFetch() {},
  // onSubmit() {},
  getFetchQuery(query) {
    return withoutTmpId(query, this.idField)
  },
  getFetchKey: (fetchQuery, option) => calcFetchKey(fetchQuery, option),
  cast: v => v,
  genId: () => `${TMP_ID_PREFIX}${Date.now()}${Math.random()}`,
}

// wrapAll
_.each(
  {
    ...state,
    addMutation,
    ...setter,
    ...submitter,
    ...fetcher,
  },
  (func, key) => {
    // eslint-disable-next-line
    functions[key] = function(...args) {
      // eslint-disable-next-line
      return func(this, ...args)
    }
  }
)

export default function create(obj) {
  const core = Object.assign({}, functions, obj)

  // init
  core._memory = {}
  core._fetchingPromises = {}
  const _fetchAts = (core._fetchAts = {})

  const collState = getState(core)
  const defaultState = { byId: {}, requests: {}, submits: {} }
  let _pendingState
  if (collState) {
    _pendingState = _.defaults({ ...collState }, defaultState)
    const { byId, requests } = _pendingState

    _.each(byId, (v, id) => {
      _fetchAts[id] = 1
      byId[id] = core.cast(v)
    })
    _.keys(requests).forEach(fetchKey => {
      _fetchAts[fetchKey] = 1
    })
  } else {
    _pendingState = defaultState
  }
  core._pendingState = _pendingState

  if (core.onInit) core.onInit()

  return core
}
