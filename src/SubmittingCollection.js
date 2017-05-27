import _ from 'lodash'

import FetchingCollection from './FetchingCollection'
import { syncOrThen } from './util/promiseUtil'

const setUndefinedFunc = () => undefined

export default class SubmittingCollection extends FetchingCollection {
  // NOTE expecting functions
  // onSubmit() {}

  constructor() {
    super()
    this.state.submits = {}
  }

  importPreload(preloadedState) {
    super.importPreload(preloadedState)
    this.state.submits = this.state.submits ? _.mapValues(this.state.submits, this.cast) : {}
  }

  getStagingState() {
    return this.state.submits
  }

  setAll(change) {
    if (this.onFetch) {
      this.mutateState({
        byId: change,
        submits: change,
      })
      this.onChange()
      if (this.onSubmit) this.submit()
    } else {
      super.setAll(change)
    }
  }

  isTidy(key) {
    // return !(key in this.getStagingState())
    return this.getStagingState()[key] === undefined
  }

  submit(onSubmit = this.onSubmit) {
    const snapshotState = this.getStagingState()
    return syncOrThen(
      onSubmit(snapshotState),
      docs => {
        if (docs !== false) {
          // return === false means don't consider current staging is submitted

          // clean snapshotState TODO check NOT mutated during HTTP POST
          const removes = _.mapValues(snapshotState, setUndefinedFunc)

          const changes = {
            submits: removes,
          }

          if (docs) {
            // if docs return, assuem all local changes can be remove, remote should feedback stored id or other normalized fields
            changes.byId = removes

            // import docs changes
            if (docs) {
              this.importAll(docs)
            }
          }

          this.mutateState(changes)
          this.onChangeDebounce()
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
