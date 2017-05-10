import _ from 'lodash'
import jsCookie from 'js-cookie'

import SubmittingCollection from './SubmittingCollection'

// Cookie
export default class Cookie extends SubmittingCollection {
  preloadStoreState(preloadedState) {
    if (global.window) {
      preloadedState[this.name] = jsCookie.get()
    }
  }

  onSubmit(changes) {
    _.each(changes, (v, k) => {
      if (v === null || v === undefined) {
        return jsCookie.remove(k)
      } else {
        return jsCookie.set(k, v, this.cookieConf)
      }
    })
  }
}
