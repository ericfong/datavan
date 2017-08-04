import _ from 'lodash'
import { toMutation } from './SyncDefaults'
import asyncResponse from './asyncResponse'

export default function (self) {
  const { getState, setData, addMutation } = self

  let fetchAts = {}

  function markFetchAt(fetchKey) {
    fetchAts[fetchKey] = 1
  }

  function hasFetchAt(fetchKey) {
    return fetchAts[fetchKey]
  }

  function invalidateFetchAt(keys) {
    if (keys) {
      // fetchAts is for query fetchKey
      // finding ids related query is too complicated
      // user should pass in query, option, and calc fetchKey again to invalidate
      _.each(keys, k => delete fetchAts[k])
    } else {
      fetchAts = {}
    }
  }

  function invalidate(ids, option) {
    let mutation
    if (ids) {
      // use query?
      const mut = { $unset: ids }
      mutation = { byId: mut, submits: mut }
    } else {
      mutation = { byId: { $set: {} }, submits: { $set: {} } }
    }
    addMutation(mutation, option)
    invalidateFetchAt(ids)
  }

  function getSubmits() {
    return getState().submits
  }

  function submit(_submit) {
    const snapshotState = getSubmits()
    const p = _submit ? _submit(snapshotState, self) : self.onSubmit(snapshotState, self)
    return Promise.resolve(p).then(
      docs => {
        if (docs !== false) {
          // return === false means don't consider current staging is submitted

          // clean snapshotState from submits to prevent submit again TODO check NOT mutated during HTTP POST
          invalidate(_.keys(snapshotState))

          if (docs) {
            asyncResponse(self, docs)
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

  Object.assign(self, {
    // NOTE for asyncResponse
    isDirty(id) {
      return id in getState().submits
    },

    markFetchAt,
    hasFetchAt,
    invalidateFetchAt,

    invalidate,
    reset: invalidate, // consider use same function all the time?

    getSubmits,

    submit,

    setData(change, option) {
      setData(change, option)
      if (!self.onFetch) return

      let submitsChange = change
      // convert $unset to undefined in submits
      if (change.$unset) {
        submitsChange = { ...change }
        delete submitsChange.$unset
        _.each(change.$unset, id => (submitsChange[id] = undefined))
      }
      addMutation({ submits: toMutation(submitsChange) })
    },
  })
}
