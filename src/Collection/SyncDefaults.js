import _ from 'lodash'

export function toMutation(change) {
  const mutation = {}
  _.each(change, (value, key) => {
    if (key === '$unset') {
      mutation.$unset = value
      return
    }
    mutation[key] = { $set: value }
  })
  return mutation
}

export const TMP_ID_PREFIX = 'dvtmp-'

export default function (table) {
  const { getState, addMutation } = table

  function getData() {
    return getState().byId
  }

  const onGet = table.onGet || _.noop

  return _.defaults(table, {
    idField: '_id',

    getData,

    onGet,

    getDataById(id, option) {
      const data = getData()
      onGet(data, id, option)
      return data[id]
    },

    setData(change, option) {
      addMutation({ byId: toMutation(change) }, option)
    },

    genId() {
      return _.uniqueId(TMP_ID_PREFIX)
    },

    onFind() {},

    cast(v) {
      return v
    },
  })
}
