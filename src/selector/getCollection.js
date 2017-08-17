import _ from 'lodash'

import getDatavan from './getDatavan'

const namespace = 'datavan'

class Collection {
  idField = '_id'

  getAll() {
    const currState = this.getDatavanState()[this.name]
    if (currState !== this._lastState) {
      this._lastState = currState
      if (this._pendingState) {
        _.merge(this._pendingState, currState)
      }
    }
    return this._pendingState || currState
  }

  onGetAll() {
    return this.getState().byId
  }

  onGet(id, option) {
    const data = this.onGetAll()
    if (this.onFetch) markMissIds(data, id, option)
    return data[id]
  }

  onSetAll(change, option) {
    this.addMutation({ byId: toMutation(change) }, option)
  }

  cast(v) {
    return v
  }

  genId() {
    return _.uniqueId(TMP_ID_PREFIX)
  }

  // onFind() {},
  // onMutate() {},

  // --------------------------------
  // Async

  // onFetch() {},
  // onSubmit() {},

  getFetchQuery(query) {
    return withoutTmpId(query, this.idField)
  }

  getFetchKey(fetchQuery, option) {
    return calcFetchKey(fetchQuery, option)
  }
}

export default function getCollection(stateOrDispatch, conf) {
  const dv = getDatavan(stateOrDispatch)

  // datavan contain collection context and conf merge into it
  let collection = dv.collections[name]
  if (collection) return collection

  // create dependencies
  // _.each(conf.dependencies, dependency => dependency(dv))

  // create collection
  collection = dv.collections[name] = {
    conf,
    override: dv.overrides[name],
    name,
    dv,

    _pendingState: null,
    _memory: {},
    _fetchAts: {},
    _fetchingPromises: {},

    // REVIEW inject base functions into here?
  }

  // init state and _pendingState
  // apply plugins

  if (!dv[name]) dv[name] = collection
  return collection
}
