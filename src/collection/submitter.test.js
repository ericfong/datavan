import _ from 'lodash'
import { createCollection } from '.'
import { getSubmits, submit, findOne, allPendings, insert, update, remove, getSubmitted } from '..'

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
  const Users = createCollection({
    name: 'users',
    onFetch,
    onSubmit: (changes, self) => doSubmit(changes, self),
  })

  insert(Users, { name: 'Apple' })
  await submit(Users)
  expect(_.size(lastSubmit)).toBe(1)
  expect(getOne(lastSubmit)).toMatchObject({ name: 'Apple' })

  insert(Users, { name: 'Car' })
  await submit(Users)
  expect(_.size(lastSubmit)).toBe(2)
  expect(getOne(lastSubmit)).toMatchObject({ name: 'Car' })

  update(Users, { name: 'Car' }, { $merge: { name: 'Car 2' } })
  await submit(Users)
  expect(_.size(lastSubmit)).toBe(2)
  expect(getOne(lastSubmit)).toMatchObject({ name: 'Car 2' })

  const removeDoc = insert(Users, { name: 'Remove' })
  await submit(Users)
  expect(Users.get(removeDoc._id)).toBe(removeDoc)
  // remove
  remove(Users, { name: 'Remove' })
  await submit(Users)
  // have a id set to undefined
  expect(_.size(getSubmits(Users))).toBe(3)
  expect(Users.get(removeDoc._id)).toBe(undefined)

  // onSubmit with feedback

  doSubmit = (changes, self) => {
    lastSubmit = changes
    const arr = _.reduce(
      changes,
      (ret, doc, oldId) => {
        if (doc) {
          ret.push({ ...doc, _key: oldId, _id: `stored-${Math.random()}` })
        }
        return ret
      },
      []
    )
    const $submitted = getSubmitted(self, changes, arr, '_key')
    return { byId: _.keyBy(arr, '_id'), $submitted }
  }
  update(Users, { name: 'Car 2' }, { $merge: { name: 'Car 3' } })
  await submit(Users)
  // all changes submitted
  expect(_.map(lastSubmit, 'name')).toEqual(['Apple', 'Car 3', undefined])
  expect(_.size(lastSubmit)).toBe(3)
  expect(_.map(Users.getAll(), 'name').sort()).toEqual(['Apple', 'Car 3'])
  expect(_.isEmpty(getSubmits(Users))).toBe(true)
})

test('basic', async () => {
  const Users = createCollection({
    name: 'users',
    idField: 'id',
    onFetch,
  })

  insert(Users, { name: 'Apple' })
  insert(Users, { name: 'Car' })
  expect(_.map(Users.onGetAll(), 'name')).toEqual(['Apple', 'Car'])
  expect(_.map(getSubmits(Users), 'name')).toEqual(['Apple', 'Car'])

  // find and update
  const car = findOne(Users, { name: 'Car' })
  update(Users, { id: car.id }, { $merge: { name: 'Car 2' } })
  expect(_.map(getSubmits(Users), 'name')).toEqual(['Apple', 'Car 2'])

  // mix data from server
  Users.get('u1')
  await Promise.all(allPendings(Users))
  expect(_.map(Users.onGetAll(), 'name')).toEqual(expect.arrayContaining(['users Eric', 'John', 'Apple', 'Car 2']))
})
