import _ from 'lodash'

import SubmittingCollection from './SubmittingCollection'
import { fetchIdInQuery } from './util/queryUtil'

function parseJson(val) {
  try {
    return JSON.parse(val)
  } catch (err) {
    return val
  }
}

// LocalStorage
export class LocalStorage extends SubmittingCollection {
  alwaysFetch = true

  onFetch(query) {
    return fetchIdInQuery(query, id => parseJson(localStorage.getItem(id)))
  }

  onSubmit(changes) {
    _.each(changes, (v, k) => {
      if (v === null || v === undefined) {
        return localStorage.removeItem(k)
      }
      return localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
    })
  }
}

export default LocalStorage

// SessionStorage
export class SessionStorage extends SubmittingCollection {
  alwaysFetch = true

  onFetch(query) {
    return fetchIdInQuery(query, id => parseJson(sessionStorage.getItem(id)))
  }

  onSubmit(changes) {
    _.each(changes, (v, k) => {
      if (v === null || v === undefined) {
        return sessionStorage.removeItem(k)
      }
      return sessionStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
    })
  }
}
