import _ from 'lodash'
import { defaultMemoize as reselectMemoize } from 'reselect'
import mutateHelper from 'immutability-helper'

export default Base => {
  return class Stage extends Base {
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

    submit(submitter = this.onSubmit) {
      const snapshotState = this.getStagingState()
      return Promise.resolve(submitter(snapshotState))
        .then(docs => {
          const storeMutation = {
            [this.name]: this.importAll(docs),
          }

          // clean snapshotState
          if (snapshotState) {
            // TODO check snapshotState is not mutated during post
            storeMutation[this.name + this.stageSuffix] = { $unset: _.keys(snapshotState) }
          }

          this._store.mutateState(storeMutation)
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
