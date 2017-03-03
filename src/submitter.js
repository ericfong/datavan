import _ from 'lodash'
import {defaultMemoize as memoize} from 'reselect'
import mutate from 'immutability-helper'

export default ({suffix = '_staging'} = {}) => Base => {
  return class Staging extends Base {
    preloadStoreState(preloadedState) {
      if (!preloadedState[this.name + suffix]) {
        preloadedState[this.name + suffix] = {}
      }
    }

    getStagingState() {
      return this.getStoreState()[this.name + suffix]
    }

    _getState = memoize((state, stagingState) => {
      return {...state, ...stagingState}
    })
    getState() {
      return this._getState(super.getState(), this.getStoreState()[this.name + suffix])
    }

    mutate(mutation) {
      // prevent set to super state
      // NOTE super state should only be set by sideLoader
      // super.mutate(mutation)

      // mutate target doc and set the whole doc into staging
      // NOTE will lost detial of each mutation when flush to server, but more simple data to handle
      const ownMutation = _.mapValues(mutation, (docMutation, id) => {
        if (docMutation.$set) {
          return docMutation
        }
        const combinedDoc = this.getState()[id]
        return {
          $set: mutate(combinedDoc, docMutation),
        }
      })
      this.mutateStoreState({
        [this.name + suffix]: ownMutation,
      })
    }

    restore(docs, snapshotState) {
      const idField = this.idField
      // import new docs from server to the real collection
      const serverMutation = {}
      _.each(docs, doc => {
        serverMutation[doc[idField]] = { $set: doc }
      })
      const storeMutation = {
        [this.name]: serverMutation,
      }

      // clean snapshotState
      if (snapshotState) {
        // TODO check snapshotState is not mutated during post
        storeMutation[this.name + suffix] = { $unset: _.keys(snapshotState) }
      }

      // real mutate
      // console.log('>>>', serverMutation, stagingMutation)
      this.mutateStoreState(storeMutation)
    }

    submit(submitter) {
      const snapshotState = this.getStagingState()
      return Promise.resolve(submitter(snapshotState))
      .then(docs => {
        this.restore(docs, snapshotState)
        return docs
      })
      .catch(err => {
        // ECONNREFUSED = Cannot reach server
        // Not Found = api is too old
        if (!(err.code === 'ECONNREFUSED' || err.message === 'Not Found' || err.response)) {
          console.error(err)
        }
        return err instanceof Error ? err : new Error(err)
      })
    }
  }
}
