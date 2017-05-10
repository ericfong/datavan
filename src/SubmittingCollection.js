import _ from 'lodash'
import { defaultMemoize as reselectMemoize } from 'reselect'

import FetchingCollection from './FetchingCollection'
import { then } from './util/promiseUtil'

export default class SubmittingCollection extends FetchingCollection {
  // NOTE expecting functions
  // onSubmit() {}

  stageSuffix = '_staging'

  preloadStoreState(preloadedState) {
    if (super.preloadStoreState) super.preloadStoreState(preloadedState)
    if (!preloadedState[this.name + this.stageSuffix]) {
      preloadedState[this.name + this.stageSuffix] = {}
    }
  }

  getStagingState() {
    return this._store.getState()[this.name + this.stageSuffix]
  }

  _getState = reselectMemoize((state, stagingState) => {
    return { ...state, ...stagingState }
  })
  getState() {
    return this._getState(super.getState(), this.getStagingState())
  }

  setAll(changes) {
    this._store.mutateState({
      [this.name + this.stageSuffix]: changes,
    })
    if (this.onSubmit) this.submit()
  }

  submit(onSubmit = this.onSubmit) {
    const snapshotState = this.getStagingState()
    return then(
      onSubmit(snapshotState),
      docs => {
        // if return === false, means DON'T clean up current staging state. Like throw exception
        if (docs !== false) {
          const feedbackMutation = {}

          if (docs) {
            // import docs changes
            const importChanges = this.importAll(docs, true)
            if (importChanges) {
              feedbackMutation[this.name] = importChanges
            }
          }

          // clean snapshotState
          if (snapshotState) {
            // TODO check snapshotState is not mutated during post
            feedbackMutation[this.name + this.stageSuffix] = _.mapValues(snapshotState, () => undefined)
          }

          // console.log('submit result', docs, feedbackMutation)
          this._store.mutateState(feedbackMutation)
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
