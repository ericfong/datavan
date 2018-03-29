import _ from 'lodash'

import { createDb } from '..'

function onFetch(query, option, collection) {
  if (Array.isArray(query)) {
    return Promise.resolve(_.map(query, id => ({ id, name: 'John' })))
  }
  return Promise.resolve([{ id: 'u2', name: `${collection.name} Eric` }])
}

test('getSubmits', async () => {
  const db = createDb({ users: { idField: 'id', onFetch } })

  db.users.insert({ name: 'Apple' })
  db.users.insert({ name: 'Car' })
  expect(_.map(db.users.getById(), 'name')).toEqual(['Apple', 'Car'])
  expect(_.map(db.users.getSubmits(), 'name')).toEqual(['Apple', 'Car'])

  // find and update
  const car = db.users.find({ name: 'Car' })[0]
  db.users.update({ id: car.id }, { $merge: { name: 'Car 2' } })
  expect(_.map(db.users.getSubmits(), 'name')).toEqual(['Apple', 'Car 2'])

  // mix data from server
  db.users.get('u1')
  await db.users.getPending()
  expect(_.map(db.users.getById(), 'name')).toEqual(expect.arrayContaining(['users Eric', 'John', 'Apple', 'Car 2']))

  // remove
  db.users.remove({ name: 'Apple' })
  expect(_.map(db.users.getSubmits(), 'name')).toEqual(['Car 2'])
})
