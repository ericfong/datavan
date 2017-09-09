import _ from 'lodash'

import { reset, getSubmits } from './original'
import importResponse from './importResponse'

export function importSubmitRes(core, submittedDocs, res) {
  if (res !== false) {
    // return === false means don't consider current staging is submitted

    // clean submittedDocs from originals to prevent submit again TODO check NOT mutated during HTTP POST
    reset(core, _.keys(submittedDocs))

    if (res) {
      importResponse(core, res)
    }
  }
  return res
}

export function submit(core, _submit) {
  const submittedDocs = getSubmits(core)
  const p = _submit ? _submit(submittedDocs, core) : core.onSubmit(submittedDocs, core)
  return Promise.resolve(p).then(
    docs => importSubmitRes(core, submittedDocs, docs),
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
