import _ from 'lodash'

import FetchingCollection from './FetchingCollection'
import { then } from './util/promiseUtil'

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
      this._store.mutateState({
        [this.name]: changes,
        // TODO check changes may be undefined
        [this.name + this.submittingTarget]: changes,
      })
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
    return then(
      onSubmit(snapshotState),
      docs => {
        // if return === false, means DON'T clean up current staging state. Like throw exception
        if (docs !== false) {
          // clean snapshotState TODO check NOT mutated during HTTP POST
          const removes = _.mapValues(snapshotState, () => undefined)
          const feedbackMutation = {}
          feedbackMutation[this.name + this.submittingTarget] = removes
          const thisCollState = (feedbackMutation[this.name] = { ...removes })

          // import docs changes
          if (docs) {
            Object.assign(thisCollState, this.importAll(docs))
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
