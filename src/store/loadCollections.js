import _ from 'lodash'

import { getCollection } from '../store-base'
import { load } from '../collection/load'

export default function loadCollections(store, inData, option = {}) {
  return _.mapValues(inData, (data, collectionName) => {
    if (collectionName[0] === '_') return data

    const collection = getCollection(store, collectionName)
    if (collection) {
      load(collection, data, option)
      return data
    }
  })
}
