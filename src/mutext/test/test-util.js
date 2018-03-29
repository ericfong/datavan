import _ from 'lodash'

import createStore from '../store'
import { getQueryIds } from '../collection-fetch'

export const testColl = (collConf, name = 'users') => {
  const store = createStore({
    [name]: collConf,
  })
  return store[name]
}

const arrToValues = (arr, func) => _.mapValues(_.keyBy(arr), func)

export const echoValue = query =>
  Promise.resolve(
    arrToValues(getQueryIds(query, '_id'), id => {
      return _.toUpper(id)
    })
  )
