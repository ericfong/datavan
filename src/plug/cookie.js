import _ from 'lodash'
import jsCookie from 'js-cookie'

export default function plugCookie(cookieConf) {
  return base =>
    Object.assign({}, base, {
      // getAll() {
      //   return jsCookie.get()
      // },
      onGet(id) {
        return jsCookie.get(id)
      },
      setAll(change, option) {
        _.each(change, (v, k) => {
          if (k === '$unset') {
            return _.each(v, id => jsCookie.remove(id))
          }
          if (v === null || v === undefined) {
            return jsCookie.remove(k)
          }
          return jsCookie.set(k, v, cookieConf)
        })
        return base.setAll.call(this, change, option)
      },
    })
}
