import _ from 'lodash'

import FetchingCollection from './FetchingCollection'
import { syncOrThen } from './util/promiseUtil'

export default class SubmittingCollection extends FetchingCollection {
  // Override: onSubmit()

  constructor(state) {
    super(state)
    state.submits = state.submits || {}
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

  submit(onSubmit = this.onSubmit) {
    const snapshotState = this.getStagingState()
    return syncOrThen(
      onSubmit(snapshotState),
      docs => {
        if (docs !== false) {
          // return === false means don't consider current staging is submitted

          // clean snapshotState TODO check NOT mutated during HTTP POST
          const $unset = _.keys(snapshotState)

          const changes = {
            submits: { $unset }, // remove from submits to prevent submit again
          }

          if (docs) {
            // if docs return, assuem all local state.byId changes can be remove
            const allUnset = docs.$unset ? _.concat(docs.$unset, $unset) : $unset
            const byIdUnset = _.uniq(_.without(allUnset, ..._.keys(docs)))
            if (byIdUnset.length > 0) {
              changes.byId = { $unset } // remove from submits to prevent submit again
            }
          }

          this.mutateState(changes)

          if (docs) {
            // remote should feedback generated id
            this.importAll(docs)
          }

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

  isDirty(key) {
    return key in this.getStagingState()
  }
}
