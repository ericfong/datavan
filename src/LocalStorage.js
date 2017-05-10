import _ from 'lodash'

import SubmittingCollection from './SubmittingCollection'

function parseJson(val) {
  try {
    return JSON.parse(val)
  } catch (err) {
    return val
  }
}

export default class LocalStorage extends SubmittingCollection {
  onFetch(query) {
    const idField = this.idField
    const id = query[idField]
    const val = parseJson(localStorage.getItem(id))
    return { [id]: val }
  }

  onSubmit(changes) {
    _.each(changes, (v, k) => {
      if (v === null || v === undefined) {
        return localStorage.removeItem(k)
      } else {
        return localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
      }
    })
  }
}
