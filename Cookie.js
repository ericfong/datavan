import _ from 'lodash'
import jsCookie from 'js-cookie'

import KeyValueStore from './KeyValueStore'


export default class Cookie extends KeyValueStore {
  preloadStoreState(preloadedState) {
    if (global.window) {
      preloadedState[this.name] = jsCookie.get()
    }
  }

  // do this in reducer?
  setState(values) {
    super.setState(values)
    _.each(values, (v, k) => {
      if (v === null || v === undefined) {
        return jsCookie.remove(k)
      } else {
        return jsCookie.set(k, v, this.cookieConf)
      }
    })
  }
}
