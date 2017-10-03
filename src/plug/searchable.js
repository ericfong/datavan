import searchObjects from '../util/searchObjects'

export default function plugSearchable({ fields }) {
  return spec =>
    Object.assign({}, spec, {
      filterHook(next, collection, docs, query, option) {
        if ('$search' in query) {
          docs = searchObjects(docs, query.$search, fields)
          delete query.$search
        }
        return next(collection, docs, query, option)
      },
    })
}
