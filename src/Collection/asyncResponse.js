import _ from 'lodash'

const getId = (doc, idField) => doc && doc[idField]

function loopResponse(res, idField, handleOne, operations) {
  if (!res) return

  // array of docs
  if (Array.isArray(res)) return _.each(res, (doc, i) => handleOne(doc, getId(doc, idField) || i))

  // table of docs / ops
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

export default function asyncResponse(table, res, fetchKey) {
  const mutation = { byId: {} }
  loopResponse(
    res,
    table.idField,
    (doc, id) => {
      if (table.isDirty(id)) return
      const castedDoc = table.cast(doc)
      const newObj = castedDoc && typeof castedDoc === 'object' ? { ...table.getDataById(id), ...castedDoc } : castedDoc
      mutation.byId[id] = { $set: newObj }
      // fetchAts[id] = now
    },
    {
      $unset(value) {
        mutation.byId.$unset = value
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
            asyncResponse(table.dv.getCollection(subName), subRes)
          })
        } else {
          console.error('Cannot use $relations recursively')
        }
      },
    }
  )
  // enforce update even null?
  // console.log('asyncResponse', res, mutation.byId)
  table.addMutation(mutation)
  // console.log('asyncResponse', table.getState())
  return res
}
