import _ from 'lodash'

import { getState, addMutation } from './base'
import { getLoadMutation, _loadAsRequest } from './load'
import { isDirty, invalidate } from './original'

const getId = (doc, idField) => doc && doc[idField]

function loopResponse(res, idField, handleOne) {
  if (!res) return

  // array of docs
  if (Array.isArray(res)) {
    _.each(res, (doc, i) => handleOne(doc, getId(doc, idField) || i))
    return null
  }

  // tables of docs / ops
  const ops = {}
  _.each(res, (value, key) => {
    if (key === '$byId') {
      _.each(value, (d, k) => handleOne(d, getId(d, idField) || k))
    } else if (key[0] === '$') {
      ops[key] = value
    } else {
      handleOne(value, getId(value, idField) || key)
    }
  })
  return ops
}

function doOps(ops, funcs) {
  if (!ops) return
  _.each(ops, (value, key) => {
    const func = funcs[key]
    if (func) func(value)
  })
}

export default function importResponse(table, res, fetchKey) {
  const mutation = { byId: {} }
  const { byId } = getState(table)
  const ops = loopResponse(res, table.idField, (doc, id) => {
    if (isDirty(table, id)) return
    mutation.byId[id] = getLoadMutation(doc, id, table, undefined, byId)
  })

  // do ops
  doOps(ops, {
    $unset(ids) {
      mutation.byId.$unset = ids
    },
    $request(value) {
      if (fetchKey) {
        mutation.requests = { [fetchKey]: getLoadMutation(value, fetchKey, table, _loadAsRequest) }
      } else {
        console.error('No fetchKey for $request=', value, 'Cannot use $request inside $relations')
      }
    },
  })

  // console.log('importResponse', res, mutation)
  if (!_.isEmpty(mutation.byId) || mutation.requests) {
    addMutation(table, mutation)
  }

  // some ops need to be after addMutation
  doOps(ops, {
    $invalidate(ids) {
      invalidate(table, ids)
    },
  })

  if (table.onImport) table.onImport(table)

  return mutation
}
