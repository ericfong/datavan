import _ from 'lodash'

import { trapArgs } from '../collection/util/runHook'

function parseJson(val) {
  try {
    return JSON.parse(val)
  } catch (err) {
    return val
  }
}

export default function plugLocalStorage(_storage) {
  const storage = _storage || global.localStorage
  return base =>
    Object.assign({}, base, {
      getAllHook() {
        return storage
      },
      getHook(next, collection, id) {
        return parseJson(storage.getItem(id))
      },
      setAllHook: trapArgs(base.setAllHook, (collection, change, option) => {
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
        return [collection, change, option]
      }),
    })
}
