import _ from 'lodash'

function parseJson(val) {
  try {
    return JSON.parse(val)
  } catch (err) {
    return val
  }
}

export default function localStorage(_storage) {
  const storage = _storage || global.localStorage
  return ({ onSetAll }) => ({
    onGetAll() {
      return storage
    },
    onGet(id) {
      return parseJson(storage.getItem(id))
    },
    onSetAll(change, option) {
      onSetAll.call(this, change, option)
      _.each(change, (value, key) => {
        if (key === '$unset') {
          _.each(value, k => storage.removeItem(k))
          return
        }
        if (value === null || value === undefined) {
          return storage.removeItem(key)
        }
        storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
      })
    },
  })
}