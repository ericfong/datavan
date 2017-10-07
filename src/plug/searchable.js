import searchObjects from '../util/searchObjects'

import runHook from '../collection/util/runHook'

export default function plugSearchable({ fields }) {
  return base =>
    Object.assign({}, base, {
      filterHook(next, collection, docs, query, option) {
        if ('$search' in query) {
          docs = searchObjects(docs, query.$search, fields)
          delete query.$search
        }
        return runHook(base.filterHook, next, collection, docs, query, option)
      },
    })
}
