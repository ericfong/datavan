import _ from 'lodash'
import jsCookie from 'js-cookie'

export default function plugKoaCookie(cookieConf, koaCtx) {
  return base =>
    Object.assign({}, base, {
      getHook(next, collection, id) {
        return koaCtx.cookies.get(id)
      },
      setAllHook(next, collection, change, option) {
        _.each(change, (v, k) => {
          if (k === '$unset') {
            return _.each(v, id => jsCookie.set(id, null))
          }
          if (v === null || v === undefined) {
            return jsCookie.set(k, null)
          }
          return koaCtx.cookies.set(k, v, cookieConf)
        })
        return next(collection, change, option)
      },
    })
}
