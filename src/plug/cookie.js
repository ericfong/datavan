import _ from 'lodash'
import jsCookie from 'js-cookie'

export default function cookie(cookieConf) {
  return {
    onGetAll() {
      return jsCookie.get()
    },
    onGet(id) {
      return jsCookie.get(id)
    },
    onSetAll(change) {
      _.each(change, (v, k) => {
        if (k === '$unset') {
          return _.each(v, id => jsCookie.remove(id))
        }
        if (v === null || v === undefined) {
          return jsCookie.remove(k)
        }
        return jsCookie.set(k, v, cookieConf)
      })
    },
  }
}
