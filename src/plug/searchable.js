import searchObjects from '../util/searchObjects'

import { trapArgs } from '../collection/util/runHook'

export default function plugSearchable({ fields }) {
  return base =>
    Object.assign({}, base, {
      filterHook: trapArgs(base.filterHook, (collection, docs, query, option) => {
        if ('$search' in query) {
          docs = searchObjects(docs, query.$search, fields)
          delete query.$search
        }
        return [collection, docs, query, option]
      }),
    })
}
