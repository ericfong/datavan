import _ from 'lodash'

import { getCollectionFromStore } from '../collection'
import { load } from '../collection/load'

export default function loadCollections(store, collectionsData) {
  _.each(collectionsData, (data, name) => {
    load(getCollectionFromStore(store, { name }), data)
  })
}
