import _ from 'lodash'

import { getTableFromStore } from './table'
import { addMutation } from './core/mutation'

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

export default function importResponse(core, res, fetchKey) {
  // if (_.isEmpty(res)) return res
  const mutation = { byId: {} }
  const ops = loopResponse(res, core.idField, (doc, id) => {
    if (core.isDirty(id)) return
    const castedDoc = core.cast(doc)
    const newObj = castedDoc && typeof castedDoc === 'object' ? { ...core.onGet(id), ...castedDoc } : castedDoc
    mutation.byId[id] = { $set: newObj }
  })

  // do ops
  doOps(ops, {
    $unset(ids) {
      mutation.byId.$unset = ids
    },
    $request(value) {
      if (fetchKey) {
        mutation.requests = { [fetchKey]: { $set: value } }
      } else {
        console.error('No fetchKey for $request=', value, 'Cannot use $request inside $relations')
      }
    },
    $relations(relations) {
      if (fetchKey) {
        _.each(relations, (subRes, subName) => {
          // TODO check has core for subName
          // console.log('$relations', subName)
          importResponse(getTableFromStore(core.store, { name: subName }), subRes)
        })
      } else {
        console.error('Cannot use $relations recursively')
      }
    },
  })

  if (!_.isEmpty(mutation.byId) || mutation.requests) {
    // console.log('importResponse', res, mutation)
    addMutation(core, mutation)
  }

  // some ops need to be after addMutation
  doOps(ops, {
    $invalidate(ids) {
      core.invalidate(ids)
    },
  })

  if (core.onImport) core.onImport(core)

  return mutation
}
