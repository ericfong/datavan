import _ from 'lodash'

const arrToValues = (arr, func) => _.mapValues(_.keyBy(arr), func)

export const echoValue = query => Promise.resolve(arrToValues(_.get(query, '_id.$in'), id => _.toUpper(id)))

export const onFetchEcho = query => Promise.resolve(_.map(_.get(query, '_id.$in'), _id => (_id ? { _id, name: _.toUpper(_id) } : undefined)))

export const onFetchById = (query, idField, func) => {
  const ids = _.get(query, `${idField}.$in`)
  return Promise.all(_.map(ids, func)).then(values => _.zipObject(ids, values))
}
