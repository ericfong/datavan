import _ from 'lodash'
import jsCookie from 'js-cookie'

export default function KoaCookie(cookieConf, koaCtx) {
  return {
    getData() {
      return null
    },
    getDataById(id) {
      return koaCtx.cookies.get(id)
    },
    setData(change) {
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
  }
}
