import _ from 'lodash'

import KeyValueStore from './KeyValueStore'

// FIXME use onFetch onSubmit

export default class LocalStorage extends KeyValueStore {
  get(id) {
    const val = localStorage.getItem(id)
    try {
      return JSON.parse(val)
    } catch (err) {
      return val
    }
  }

  setAll(values) {
    _.each(values, (v, k) => {
      if (v === null || v === undefined) {
        return localStorage.removeItem(k)
      } else {
        return localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
      }
    })

    super.setAll(values)
  }
}
