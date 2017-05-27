import _ from 'lodash'
import jsCookie from 'js-cookie'

import SubmittingCollection from './SubmittingCollection'

// Cookie
export default class Cookie extends SubmittingCollection {
  cookieConf = null

  importPreload(preloadedState) {
    if (global.window) {
      preloadedState.byId = jsCookie.get()
    }
    super.importPreload(preloadedState)
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
