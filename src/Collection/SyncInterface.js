export default function (self) {
  const { get, find } = self

  Object.assign(self, {
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
