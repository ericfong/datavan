import _ from 'lodash'

import createDb from '../db'
import { getQueryIds } from '../collection-fetch'

export const testColl = (collConf, name = 'users') => {
  const db = createDb({
    [name]: collConf,
  })
  return db[name]
}

const arrToValues = (arr, func) => _.mapValues(_.keyBy(arr), func)

export const echoValue = query =>
  Promise.resolve(
    arrToValues(getQueryIds(query, '_id'), id => {
      return _.toUpper(id)
    })
  )
