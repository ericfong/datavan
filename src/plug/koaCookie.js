import _ from 'lodash'
import jsCookie from 'js-cookie'

export default function plugKoaCookie(cookieConf, koaCtx) {
  return spec =>
    Object.assign({}, spec, {
      onGetAll() {
        return null
      },
      onGet(id) {
        return koaCtx.cookies.get(id)
      },
      onSetAll(change) {
        _.each(change, (v, k) => {
          if (k === '$unset') {
            return _.each(v, id => jsCookie.set(id, null))
          }
          if (v === null || v === undefined) {
            return jsCookie.set(k, null)
          }
          return koaCtx.cookies.set(k, v, cookieConf)
        })
      },
    })
}
