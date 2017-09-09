import _ from 'lodash'

import { getTableFromStore } from '../collection'
import importResponse from '../collection/importResponse'

export default function loadCollections(store, collectionsData) {
  _.each(collectionsData, (subRes, subName) => {
    importResponse(getTableFromStore(store, { name: subName }), subRes)
  })
}
