import _ from 'lodash'

import { getSubmits } from './base'
import { load } from './load'

export function getSubmittedIds(self, tmps, storeds, oldIdKey) {
  // tmp id to stored id table
  return {
    ..._.mapValues(tmps, () => null),
    ..._.mapValues(_.keyBy(storeds, oldIdKey), self.idField),
  }
}

export function submit(self, _submit) {
  const submittedDocs = getSubmits(self)
  const p = _submit ? _submit(submittedDocs, self) : self.onSubmit(submittedDocs, self)
  return Promise.resolve(p).then(
    docs => load(self, docs),
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
