import _ from 'lodash'

import { getCollectionFromStore } from '../collection'
import { load, loadAsDefaults } from '../collection/load'

export default function loadCollections(store, inData, option = {}) {
  const storeData = store.getState().datavan
  const isMerge = !storeData._timestamp || !inData._timestamp || storeData._timestamp < inData._timestamp
  option.loadAs = isMerge ? undefined : loadAsDefaults

  // mapValues to return inData like data, for merge or replacing store state
  return _.mapValues(inData, (data, name) => {
    if (name[0] === '_') return data

    const collection = getCollectionFromStore(store, { name }, false)
    if (collection) {
      load(collection, data, option)
      return data
    }
    const storeCollData = storeData[name]
    return isMerge ? _.merge(_.clone(storeCollData), data) : _.merge(data, storeCollData)
  })
}
