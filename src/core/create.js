import _ from 'lodash'

import * as state from '../state'
import * as setter from '../setter'
import * as submitter from '../submitter'
import * as fetcher from '../fetcher'

import { addMutation } from './mutation'
import { markMissIds } from './finder'
import { withoutTmpId, TMP_ID_PREFIX } from './idUtil'
import { calcFetchKey } from './keyUtil'

const functions = {
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

export default function create(spec) {
  const core = Object.assign({}, functions, spec)

  // init
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

  if (core.onInit) core.onInit()

  return core
}
