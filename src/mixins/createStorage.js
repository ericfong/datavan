import _ from 'lodash'

function parseJson(val) {
  try {
    return JSON.parse(val)
  } catch (err) {
    return val
  }
}

export default function createStorage(storage) {
  return {
    getData() {
      return storage
    },
    getDataById(id) {
      return parseJson(storage.getItem(id))
    },
    setData(change) {
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
  }
}
