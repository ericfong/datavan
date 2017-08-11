import _ from 'lodash'
import asyncResponse from './asyncResponse'

export function invalidateFetchAt(self, ids) {
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

export default {
  // NOTE for asyncResponse
  isDirty(id) {
    return id in this.getState().submits
  },

  invalidate(ids) {
    invalidateFetchAt(this, ids)
  },

  reset(ids, option) {
    invalidateFetchAt(this, ids)
    const mut = ids ? { $unset: ids } : { $set: {} }
    const mutation = { byId: mut, requests: mut, submits: mut }
    this.addMutation(mutation, option)
  },

  getSubmits() {
    return this.getState().submits
  },

  submit(_submit) {
    const snapshotState = this.getSubmits()
    const p = _submit ? _submit(snapshotState, this) : this.onSubmit(snapshotState, this)
    return Promise.resolve(p).then(
      docs => {
        if (docs !== false) {
          // return === false means don't consider current staging is submitted

          // clean snapshotState from submits to prevent submit again TODO check NOT mutated during HTTP POST
          this.reset(_.keys(snapshotState))

          if (docs) {
            asyncResponse(this, docs)
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
  },
}
