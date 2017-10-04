import _ from 'lodash'
import jsCookie from 'js-cookie'

export default function plugCookie(cookieConf) {
  return base =>
    Object.assign({}, base, {
      getHook(next, collection, id) {
        return jsCookie.get(id)
      },
      setAllHook(next, collection, change, option) {
        _.each(change, (v, k) => {
          if (k === '$unset') {
            return _.each(v, id => jsCookie.remove(id))
          }
          if (v === null || v === undefined) {
            return jsCookie.remove(k)
          }
          return jsCookie.set(k, v, cookieConf)
        })
        return next(collection, change, option)
      },
    })
}
