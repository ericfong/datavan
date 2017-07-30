import _ from 'lodash'
import { toMutation } from './SyncDefaults'
import asyncResponse from './asyncResponse'

export default function (collection) {
  const { getState, setData, addMutation, onSubmit } = collection

  function invalidate(ids, option) {
    let mutation
    if (ids) {
      const mut = { $unset: ids }
      mutation = { byId: mut, submits: mut }
    } else {
      mutation = { byId: { $set: {} }, submits: { $set: {} } }
    }
    addMutation(mutation, option)
  }

  function getSubmits() {
    return getState().submits
  }

  function submit(_submit = onSubmit) {
    const snapshotState = getSubmits()
    return Promise.resolve(_submit(collection, snapshotState)).then(
      docs => {
        if (docs !== false) {
          // return === false means don't consider current staging is submitted

          // clean snapshotState from submits to prevent submit again TODO check NOT mutated during HTTP POST
          invalidate(_.keys(snapshotState))

          if (docs) {
            asyncResponse(collection, docs)
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

  return Object.assign(collection, {
    // NOTE for asyncResponse
    isDirty(id) {
      return id in getState().submits
    },

    invalidate,

    getSubmits,

    submit,

    setData(change, option) {
      setData(change, option)

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
