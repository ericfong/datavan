import _ from 'lodash'
import jsCookie from 'js-cookie'

export default function plugKoaCookie(cookieConf, koaCtx) {
  return base =>
    Object.assign({}, base, {
      // getAll() {
      //   return null
      // },
      onGet(id) {
        return koaCtx.cookies.get(id)
      },
      setAll(change, option) {
        _.each(change, (v, k) => {
          if (k === '$unset') {
            return _.each(v, id => jsCookie.set(id, null))
          }
          if (v === null || v === undefined) {
            return jsCookie.set(k, null)
          }
          return koaCtx.cookies.set(k, v, cookieConf)
        })
        return base.setAll.call(this, change, option)
      },
    })
}
