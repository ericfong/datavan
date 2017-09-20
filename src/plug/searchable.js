import searchObjects from '../util/searchObjects'

export default function plugSearchable({ fields }) {
  return spec =>
    Object.assign({}, spec, {
      preFind(docs, query) {
        if ('$search' in query) {
          const ret = searchObjects(docs, query.$search, fields)
          delete query.$search
          return ret
        }
      },
    })
}
