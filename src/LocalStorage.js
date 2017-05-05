import _ from 'lodash'

import KeyValueStore from './KeyValueStore'


export default class LocalStorage extends KeyValueStore {

  // TODO should not override get, but use cache OR preload data from remote source (in thise case, localStorage) ?
  get(id) {
    const val = localStorage.getItem(id)
    try {
      return JSON.parse(val)
    } catch (err) {
      return val
    }
  }

  setState(values) {
    _.each(values, (v, k) => {
      if (v === null || v === undefined) {
        return localStorage.removeItem(k)
      } else {
        return localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
      }
    })

    super.setState(values)
  }
}
