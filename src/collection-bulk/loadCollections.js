import _ from 'lodash'

import { getCollectionFromStore } from '../collection'
import importResponse from '../collection/importResponse'

export default function loadCollections(store, collectionsData) {
  _.each(collectionsData, (subRes, subName) => {
    importResponse(getCollectionFromStore(store, { name: subName }), subRes)
  })
}
