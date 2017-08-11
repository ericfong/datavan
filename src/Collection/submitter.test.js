import _ from 'lodash'
import Collection from '.'

const getOne = lastSubmit => lastSubmit[_.last(Object.keys(lastSubmit))]

function onFetch(query, option, collection) {
  if (Array.isArray(query)) {
    return Promise.resolve(_.map(query, id => ({ id, name: 'John' })))
  }
  return Promise.resolve([{ id: 'u2', name: `${collection.name} Eric` }])
}

test('onSubmit', async () => {
  let lastSubmit
  let doSubmit = changes => {
    lastSubmit = changes
    return false
  }
  const Users = Collection({
    name: 'users',
    onFetch,
    onSubmit: changes => doSubmit(changes),
  })

  Users.insert({ name: 'Apple' })
  await Users.submit()
  expect(_.size(lastSubmit)).toBe(1)
  expect(getOne(lastSubmit)).toMatchObject({ name: 'Apple' })

  Users.insert({ name: 'Car' })
  await Users.submit()
  expect(_.size(lastSubmit)).toBe(2)
  expect(getOne(lastSubmit)).toMatchObject({ name: 'Car' })

  Users.update({ name: 'Car' }, { $merge: { name: 'Car 2' } })
  await Users.submit()
  expect(_.size(lastSubmit)).toBe(2)
  expect(getOne(lastSubmit)).toMatchObject({ name: 'Car 2' })

  const removeDoc = Users.insert({ name: 'Remove' })
  await Users.submit()
  expect(Users.get(removeDoc._id)).toBe(removeDoc)
  // remove
  Users.remove({ name: 'Remove' })
  await Users.submit()
  // have a id set to undefined
  expect(_.size(Users.getSubmits())).toBe(3)
  expect(Users.get(removeDoc._id)).toBe(undefined)

  // onSubmit with feedback

  doSubmit = changes => {
    lastSubmit = changes
    return _.reduce(
      changes,
      (ret, doc) => {
        if (doc) {
          ret.push({ ...doc, _id: `stored-${Math.random()}` })
        }
        return ret
      },
      []
    )
  }
  Users.update({ name: 'Car 2' }, { $merge: { name: 'Car 3' } })
  await Users.submit()
  // all changes submitted
  expect(_.map(lastSubmit, 'name')).toEqual(['Apple', 'Car 3', undefined])
  expect(_.size(lastSubmit)).toBe(3)
  expect(_.compact(_.map(Users.onGetAll(), 'name')).sort()).toEqual(['Apple', 'Car 3'])
  expect(_.isEmpty(Users.getSubmits())).toBe(true)
})

test('basic', async () => {
  const Users = Collection({
    name: 'users',
    idField: 'id',
    onFetch,
  })

  Users.insert({ name: 'Apple' })
  Users.insert({ name: 'Car' })
  expect(_.map(Users.onGetAll(), 'name')).toEqual(['Apple', 'Car'])
  expect(_.map(Users.getSubmits(), 'name')).toEqual(['Apple', 'Car'])

  // find and update
  const car = Users.findOne({ name: 'Car' })
  Users.update({ id: car.id }, { $merge: { name: 'Car 2' } })
  expect(_.map(Users.getSubmits(), 'name')).toEqual(['Apple', 'Car 2'])

  // mix data from server
  Users.get('u1')
  await Promise.all(Users.allPendings())
  expect(_.map(Users.onGetAll(), 'name')).toEqual(expect.arrayContaining(['users Eric', 'John', 'Apple', 'Car 2']))
})
