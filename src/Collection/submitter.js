import _ from 'lodash'
import asyncResponse from './asyncResponse'

export function invalidateFetchAt(self, keys) {
  if (keys) {
    // fetchAts is for query fetchKey
    // finding ids related query is too complicated
    // user should pass in query, option, and calc fetchKey again to invalidate
    const fetchAts = self._fetchAts
    _.each(keys, k => delete fetchAts[k])
  } else {
    self._fetchAts = {}
  }
}

export default {
  // NOTE for asyncResponse
  isDirty(id) {
    return id in this.getState().submits
  },

  invalidate(ids, option) {
    let mutation
    if (ids) {
      // use query?
      const mut = { $unset: ids }
      mutation = { byId: mut, submits: mut }
    } else {
      mutation = { byId: { $set: {} }, submits: { $set: {} } }
    }
    invalidateFetchAt(this, ids)
    this.addMutation(mutation, option)
  },
  // consider use same function all the time?
  reset(ids, option) {
    return this.invalidate(ids, option)
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
          this.invalidate(_.keys(snapshotState))

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
