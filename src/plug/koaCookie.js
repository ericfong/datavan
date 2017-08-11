import _ from 'lodash'
import jsCookie from 'js-cookie'

export default function plugKoaCookie(cookieConf, koaCtx) {
  return ({ onSetAll }) => ({
    onGetAll() {
      return null
    },
    onGet(id) {
      return koaCtx.cookies.get(id)
    },
    onSetAll(change, option) {
      onSetAll.call(this, change, option)
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
