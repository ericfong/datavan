import _ from 'lodash'

import SubmittingCollection from './SubmittingCollection'

function parseJson(val) {
  try {
    return JSON.parse(val)
  } catch (err) {
    return val
  }
}

function syncFetcher(func) {
  return function onFetch(query) {
    const idField = this.idField
    const id = query[idField]
    return { [id]: func(id) }
  }
}

// LocalStorage
export default class LocalStorage extends SubmittingCollection {
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
LocalStorage.prototype.onFetch = syncFetcher(id => parseJson(localStorage.getItem(id)))

// SessionStorage
export class SessionStorage extends SubmittingCollection {
  onSubmit(changes) {
    _.each(changes, (v, k) => {
      if (v === null || v === undefined) {
        return sessionStorage.removeItem(k)
      } else {
        return sessionStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
      }
    })
  }
}
SessionStorage.prototype.onFetch = syncFetcher(id => parseJson(sessionStorage.getItem(id)))
