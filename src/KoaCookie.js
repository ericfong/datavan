import _ from 'lodash'

import SubmittingCollection from './SubmittingCollection'
import { fetchIdInQuery } from './util/queryUtil'

// const DAY = 24 * 3600 * 1000

// Cookie
export default class Cookie extends SubmittingCollection {
  koaCtx = null
  cookieConf = null

  onFetch(query) {
    return fetchIdInQuery(query, id => this.koaCtx.cookies.get(id))
  }

  onSubmit(changes) {
    _.each(changes, (value, id) => {
      // const conf = {
      //   ...this.cookieConf,
      //   expires: new Date(Date.now() + expires * DAY),
      //   domain,
      //   path,
      //   secure,
      //   signed,
      //   httpOnly,
      //   overwrite,
      // }
      this.koaCtx.cookies.set(id, value, this.cookieConf)
    })
  }
}
