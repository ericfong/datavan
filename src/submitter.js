import _ from 'lodash'

import importResponse from './importResponse'
import { getState } from './state'
import { addMutation } from './core/mutation'

function invalidateFetchAt(table, ids) {
  table._fetchAts = ids ? _.omit(table._fetchAts, ids) : {}
}

export function isDirty(core, id) {
  return id in getState(core).originals
}

export function getSubmits(core) {
  const { byId, originals } = getState(core)
  return _.mapValues(originals, (v, k) => byId[k])
}

export function getOriginals(core) {
  return getState(core).originals
}

export function invalidate(core, ids, option) {
  invalidateFetchAt(core, ids)
  const { byId, requests, originals } = getState(core)
  const byIdUnset = _.filter(ids || Object.keys(byId), id => !(id in originals))
  const requestUnset = _.filter(ids || Object.keys(requests), id => !(id in originals))
  const mut = { byId: { $unset: byIdUnset }, requests: { $unset: requestUnset } }
  addMutation(core, mut, option)
}

export function reset(core, ids, option) {
  invalidateFetchAt(core, ids)
  const mutSet = ids ? { $unset: ids } : { $set: {} }
  const mut = { byId: mutSet, requests: mutSet, originals: mutSet }
  addMutation(core, mut, option)
}

export function importSubmitRes(core, submittedDocs, res) {
  if (res !== false) {
    // return === false means don't consider current staging is submitted

    // clean submittedDocs from originals to prevent submit again TODO check NOT mutated during HTTP POST
    reset(core, _.keys(submittedDocs))

    if (res) {
      importResponse(core, res)
    }
  }
  return res
}

export function submit(core, _submit) {
  const submittedDocs = getSubmits(core)
  const p = _submit ? _submit(submittedDocs, core) : core.onSubmit(submittedDocs, core)
  return Promise.resolve(p).then(
    docs => importSubmitRes(core, submittedDocs, docs),
    err => {
      // ECONNREFUSED = Cannot reach server
      // Not Found = api is too old
      if (!(err.code === 'ECONNREFUSED' || err.message === 'Not Found' || err.response)) {
        console.error(err)
      }
      return err instanceof Error ? err : new Error(err)
    }
  )
}
