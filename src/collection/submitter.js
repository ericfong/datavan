import _ from 'lodash'

import { getState } from './base'
import { load, normalizeLoadData } from './load'

export function getOriginals(table) {
  return getState(table).originals
}

export function getSubmits(table) {
  const { byId, originals } = getState(table)
  return _.mapValues(originals, (v, k) => byId[k])
}

export function isDirty(table, id) {
  if (process.env.NODE_ENV === 'development') console.warn('isDirty() is deprecated')
  return id in getState(table).originals
}

const cleanSubmitted = tmps => _.mapValues(tmps, () => null)

export function getSubmittedIds(self, tmps, storeds, oldIdKey) {
  // tmp id to stored id table
  return {
    ...cleanSubmitted(tmps),
    ..._.mapValues(_.keyBy(storeds, oldIdKey), self.idField),
  }
}

export function submit(self, _submit) {
  const submittedDocs = getSubmits(self)
  const p = _submit ? _submit(submittedDocs, self) : self.onSubmit(submittedDocs, self)
  return Promise.resolve(p).then(
    rawRes => {
      if (rawRes) {
        // !rawRes means DON'T consider as submitted
        const data = normalizeLoadData(self, rawRes)
        // clean submittedDocs from originals to prevent submit again TODO check NOT mutated during HTTP POST
        data.$submittedIds = { ...cleanSubmitted(submittedDocs), ...data.$submittedIds }
        load(self, data)
      }
      return rawRes
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
