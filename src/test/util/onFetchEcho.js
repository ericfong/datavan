import _ from 'lodash'

import { getQueryIds } from '../../collection/findInMemory'

export const timeoutResolve = (value, t = 10) => new Promise(resolve => setTimeout(() => resolve(value), t))

export default query =>
  timeoutResolve(_.map(getQueryIds(query, '_id'), _id => {
    return _id ? { _id, name: _.toUpper(_id) } : undefined
  }))

export const echoValue = query =>
  timeoutResolve(_.mapValues(_.keyBy(getQueryIds(query, '_id')), id => {
    return _.toUpper(id)
  }))
