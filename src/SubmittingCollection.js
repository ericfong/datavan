import _ from 'lodash'

import FetchingCollection from './FetchingCollection'
import { syncOrThen } from './util/promiseUtil'
import { DELETE_FROM_STORE } from './defineStore'

const deleteFromStoreFunc = () => DELETE_FROM_STORE

export default class SubmittingCollection extends FetchingCollection {
  // NOTE expecting functions
  // onSubmit() {}

  submittingTarget = '_staging'

  preloadStoreState(preloadedState) {
    if (super.preloadStoreState) super.preloadStoreState(preloadedState)
    if (!preloadedState[this.name + this.submittingTarget]) {
      preloadedState[this.name + this.submittingTarget] = {}
    }
  }

  getStagingState() {
    return this._store.getState()[this.name + this.submittingTarget]
  }

  setAll(changes) {
    if (this.onFetch) {
      const allChanges = {
        [this.name]: changes,
        // convert DELETE_FROM_STORE to undefined in staging, so that undefined will be Dirty
        [this.name + this.submittingTarget]: _.mapValues(changes, change => (change === DELETE_FROM_STORE ? undefined : change)),
      }
      if (this._store.addChanges(allChanges)) {
        this._store.dispatchNow()
      }
      if (this.onSubmit) this.submit()
    } else {
      super.setAll(changes)
    }
  }

  isTidy(key) {
    return !(key in this.getStagingState())
  }

  submit(onSubmit = this.onSubmit) {
    const snapshotState = this.getStagingState()
    return syncOrThen(
      onSubmit(snapshotState),
      docs => {
        if (docs !== false) {
          // return === false means don't consider current staging is submitted

          // clean snapshotState TODO check NOT mutated during HTTP POST
          const removes = _.mapValues(snapshotState, deleteFromStoreFunc)
          const feedbackMutation = {}
          feedbackMutation[this.name + this.submittingTarget] = removes

          if (docs) {
            // if docs return, assuem all local changes can be remove, remote should feedback stored id or other normalized fields
            const thisCollState = (feedbackMutation[this.name] = { ...removes })

            // import docs changes
            if (docs) {
              Object.assign(thisCollState, this.importAll(docs))
            }
          }

          // console.log('submit result', docs, feedbackMutation)
          if (this._store.addChanges(feedbackMutation)) {
            this._store.dispatchDebounce()
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
}
