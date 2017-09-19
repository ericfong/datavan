import _ from 'lodash'

import { getSubmits } from './base'
import { reset } from './invalidate'
import { load } from './load'

export function importSubmitRes(self, submittedDocs, res) {
  if (res !== false) {
    // return === false means don't consider current staging is submitted

    // clean submittedDocs from originals to prevent submit again TODO check NOT mutated during HTTP POST
    reset(self, _.keys(submittedDocs))

    if (res) load(self, res)
  }
  return res
}

export function submit(self, _submit) {
  const submittedDocs = getSubmits(self)
  const p = _submit ? _submit(submittedDocs, self) : self.onSubmit(submittedDocs, self)
  return Promise.resolve(p).then(
    docs => importSubmitRes(self, submittedDocs, docs),
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
