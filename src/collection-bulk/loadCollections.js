import _ from 'lodash'

import { getCollectionFromStore } from '../collection'
import { load, loadAsDefaults } from '../collection/load'

export default function loadCollections(store, vanData, option = {}) {
  const inTimestamp = vanData._timestamp
  const isMerge = !inTimestamp || inTimestamp > (store.getState().datavan._timestamp || 0)
  option.loadAs = isMerge ? undefined : loadAsDefaults
  _.each(vanData, (data, name) => {
    load(getCollectionFromStore(store, { name }), data, option)
  })
}
