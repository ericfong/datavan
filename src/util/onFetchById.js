import _ from 'lodash'
import { getQueryIds } from '../Collection/finder'

export default function onFetchById(query, idField, func) {
  const ids = getQueryIds(query, idField)
  return Promise.all(_.map(ids, func)).then(values => _.zipObject(ids, values))
}
