export default function (table) {
  const { get, find } = table

  return Object.assign(table, {
    get(id, option) {
      return get(id, option || {})
    },

    find(query, option) {
      return find(query || {}, option || {})
    },

    findOne(query, option) {
      return find(query, { ...option, limit: 1 })[0]
    },
  })
}
