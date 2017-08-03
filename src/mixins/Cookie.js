import _ from 'lodash'
import jsCookie from 'js-cookie'

export default function Cookie(cookieConf) {
  return {
    getData() {
      return jsCookie.get()
    },
    getDataById(id) {
      return jsCookie.get(id)
    },
    setData(change) {
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
