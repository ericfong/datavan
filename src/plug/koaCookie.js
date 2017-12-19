import _ from 'lodash'
import jsCookie from 'js-cookie'

import { trapArgs } from '../collection/util/runHook'

export default function plugKoaCookie(cookieConf, koaCtx) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('plugKoaCookie is depreacted. Please use some standard redux persist layer to load and save')
  }
  return base =>
    Object.assign({}, base, {
      getHook(next, collection, id) {
        return koaCtx.cookies.get(id)
      },
      setAllHook: trapArgs(base.setAllHook, (collection, change, option) => {
        _.each(change, (v, k) => {
          if (k === '$unset') {
            return _.each(v, id => jsCookie.set(id, null))
          }
          if (v === null || v === undefined) {
            return koaCtx.cookies.set(k, null)
          }
          return koaCtx.cookies.set(k, v, cookieConf)
        })
        return [collection, change, option]
      }),
    })
}
