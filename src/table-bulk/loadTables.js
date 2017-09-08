import _ from 'lodash'

import { getTableFromStore } from '../table'
import importResponse from '../table/importResponse'

export default function loadTables(store, relations) {
  _.each(relations, (subRes, subName) => {
    // TODO check has table for subName
    // console.log('$relations', subName)
    importResponse(getTableFromStore(store, { name: subName }), subRes)
  })
}
