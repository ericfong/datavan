import _ from 'lodash'

import importResponse from './importResponse'
import { getState } from './state'
import { addMutation } from './core/mutation'

function invalidateFetchAt(self, ids) {
  const newFetchAts = {}
  if (ids) {
    const { byId, requests } = self.getState()
    const idTable = _.keyBy(ids)
    const omit = (v, k) => {
      if (!(k in idTable)) {
        newFetchAts[k] = 1
      }
    }
    _.each(byId, omit)
    _.each(requests, omit)
    // NOTE will omit all query fetchKey, only keep byId and requests
  }
  self._fetchAts = newFetchAts
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
  const { originals } = getState(core)
  let mut
  if (ids) {
    mut = { byId: { $unset: _.filter(ids, id => !originals[id]) }, requests: { $unset: ids } }
  } else {
    mut = { byId: { $set: {} }, requests: { $set: {} } }
  }
  addMutation(core, mut, option)
}

export function reset(core, ids, option) {
  invalidateFetchAt(core, ids)
  const mut = ids ? { $unset: ids } : { $set: {} }
  const mutation = { byId: mut, requests: mut, originals: mut }
  addMutation(core, mutation, option)
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
