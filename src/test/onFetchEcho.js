import _ from 'lodash'

import { getQueryIds } from '..'

export default query => _.map(getQueryIds(query, '_id'), _id => (_id ? { _id, name: _.toUpper(_id) } : undefined))

export const echoValue = query => _.mapValues(_.keyBy(getQueryIds(query, '_id')), id => _.toUpper(id))
