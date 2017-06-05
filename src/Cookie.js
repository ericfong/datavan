import _ from 'lodash'
import jsCookie from 'js-cookie'

import KeyValueStore from './KeyValueStore'

// Cookie
export default class Cookie extends KeyValueStore {
  cookieConf = null

  constructor(state) {
    super(state)
    if (global.window) {
      state.byId = jsCookie.get() || {}
    }
  }

  setAll(change) {
    super.setAll(change)
    _.each(change, (v, k) => {
      if (v === null || v === undefined) {
        return jsCookie.remove(k)
      }
      return jsCookie.set(k, v, this.cookieConf)
    })
  }
}
