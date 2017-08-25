import _ from 'lodash'

import asyncResponse from './asyncResponse'
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
  return id in getState(core).submits
}

export function getSubmits(core) {
  return getState(core).submits
}

export function invalidate(core, ids, option) {
  invalidateFetchAt(core, ids)
  const submits = getSubmits(core)
  let mut
  if (ids) {
    mut = { byId: { $unset: _.filter(ids, id => !submits[id]) }, requests: { $unset: ids } }
  } else {
    mut = { byId: { $set: {} }, requests: { $set: {} } }
  }
  addMutation(core, mut, option)
}

export function reset(core, ids, option) {
  invalidateFetchAt(core, ids)
  const mut = ids ? { $unset: ids } : { $set: {} }
  const mutation = { byId: mut, requests: mut, submits: mut }
  addMutation(core, mutation, option)
}

export function submit(core, _submit) {
  const snapshotState = getSubmits(core)
  const p = _submit ? _submit(snapshotState, core) : core.onSubmit(snapshotState, core)
  return Promise.resolve(p).then(
    docs => {
      if (docs !== false) {
        // return === false means don't consider current staging is submitted

        // clean snapshotState from submits to prevent submit again TODO check NOT mutated during HTTP POST
        reset(core, _.keys(snapshotState))

        if (docs) {
          asyncResponse(core, docs)
        }
      }
      return docs
    },
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
