import _ from 'lodash'
import { invalidateFetchAt } from './submitter'

const getId = (doc, idField) => doc && doc[idField]

function loopResponse(res, idField, handleOne, operations) {
  if (!res) return

  // array of docs
  if (Array.isArray(res)) return _.each(res, (doc, i) => handleOne(doc, getId(doc, idField) || i))

  // collection of docs / ops
  _.each(res, (value, key) => {
    if (key === '$byId') {
      _.each(value, (d, k) => handleOne(d, getId(d, idField) || k))
    } else if (key[0] === '$') {
      const opFunc = operations[key]
      if (opFunc) {
        opFunc(value)
      } else {
        throw new Error(`Unknown import operation ${key}`)
      }
    } else {
      handleOne(value, getId(value, idField) || key)
    }
  })
}

export default function asyncResponse(collection, res, fetchKey) {
  if (_.isEmpty(res)) return res
  const mutation = { byId: {} }
  loopResponse(
    res,
    collection.idField,
    (doc, id) => {
      if (collection.isDirty(id)) return
      const castedDoc = collection.cast(doc)
      const newObj = castedDoc && typeof castedDoc === 'object' ? { ...collection.onGet(id), ...castedDoc } : castedDoc
      mutation.byId[id] = { $set: newObj }
      // fetchAts[id] = now
    },
    {
      $unset(value) {
        mutation.byId.$unset = value
        // NOTE res can use $unset to remove fetchAt
        invalidateFetchAt(collection, value)
      },
      $invalidate(ids) {
        invalidateFetchAt(collection, ids)
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
            // TODO check has collection for subName
            asyncResponse(collection.dv.getCollection(subName), subRes)
          })
        } else {
          console.error('Cannot use $relations recursively')
        }
      },
    }
  )
  // enforce update even null?
  // console.log('asyncResponse', res, mutation)
  collection.addMutation(mutation)
  // console.log('asyncResponse', collection.getState())
  return res
}
