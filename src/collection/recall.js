import _ from 'lodash'
import stringify from 'fast-stable-stringify'

import { memorize } from '.'

export const buildIndex = (docs, fields, isUnique) => {
  fields = Array.isArray(fields) ? fields : [fields]
  const field = fields[0]
  if (fields.length === 1) {
    return isUnique ? _.keyBy(docs, field) : _.groupBy(docs, field)
  }
  const restSteps = fields.slice(1)
  const groups = _.groupBy(docs, field)
  return _.mapValues(groups, groupDocs => buildIndex(groupDocs, restSteps, isUnique))
}

export const recall = (coll, fnName, ...args) => {
  const func = coll[fnName] || (fnName === 'buildIndex' ? buildIndex : null)
  if (process.env.NODE_ENV !== 'production' && typeof func !== 'function') {
    console.error(`recall cannot find "${fnName}" in collection "${coll && coll.name}"`)
  }
  return memorize(coll, `${fnName}-${stringify(args)}`, state => func.apply(coll, [state.byId, ...args]))
}
