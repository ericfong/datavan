import _ from 'lodash'

import { load, normalizeLoadData } from './load'
import { dispatchMutations } from '../store'

export function getOriginals(collection) {
  return collection.getState().originals
}

export function getSubmits(collection) {
  const { byId, originals } = collection.getState()
  return _.mapValues(originals, (v, k) => byId[k])
}

const cleanSubmitted = tmps => _.mapValues(tmps, () => null)

export function getSubmittedIds(self, tmps, storeds, oldIdKey) {
  // tmp id to stored id table
  return {
    ...cleanSubmitted(tmps),
    ..._.mapValues(_.keyBy(storeds, oldIdKey), self.idField),
  }
}

// maybe deprecate submit and onSubmit, favor use to POST themself and use getSubmittedIds to create $submittedIds
export function submit(collection, _submit) {
  const submittedDocs = getSubmits(collection)
  const p = _submit ? _submit(submittedDocs, collection) : collection.onSubmit(submittedDocs, collection)
  return Promise.resolve(p).then(
    res => {
      if (res) {
        if (res.$submittedIds) {
          load(collection, res)
        } else {
          const data = normalizeLoadData(collection, res)
          // clean submittedDocs from originals to prevent submit again
          // TODO check NOT mutated during HTTP POST
          data.$submittedIds = cleanSubmitted(submittedDocs)
          load(collection, data)
        }
        // flush dispatch mutates after load()
        dispatchMutations(collection.store)
      }
      return res
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
