import _ from 'lodash'

import { createDb } from '..'

function onFetch(query, option, coll) {
  const ids = _.get(query, ['id', '$in'])
  if (ids) {
    return Promise.resolve(_.map(ids, id => ({ id, name: 'John' })))
  }
  return Promise.resolve([{ id: 'u2', name: `${coll.name} Eric` }])
}

test('getLatestDb', async () => {
  const db = createDb({ users: {} })
  const dbClone = { ...db }
  dbClone.insert('users', { name: 'Apple' })
  expect(_.map(dbClone.getById('users'), 'name')).toEqual(['Apple'])
  dbClone.insert('users', { name: 'Car' })
  expect(_.map(dbClone.getById('users'), 'name')).toEqual(['Apple', 'Car'])
})

test('getSubmits', async () => {
  const db = createDb({ users: { idField: 'id', onFetch } })

  db.insert('users', { name: 'Apple' })
  db.insert('users', { name: 'Car' })
  expect(_.map(db.getById('users'), 'name')).toEqual(['Apple', 'Car'])
  expect(_.map(db.getSubmits('users'), 'name')).toEqual(['Apple', 'Car'])

  // find and update
  const car = db.find('users', { name: 'Car' })[0]
  db.update('users', { id: car.id }, { $merge: { name: 'Car 2' } })
  expect(_.map(db.getSubmits('users'), 'name')).toEqual(['Apple', 'Car 2'])

  // mix data from server
  db.get('users', 'u1')
  await db.getPending('users')
  expect(_.map(db.getById('users'), 'name')).toEqual(expect.arrayContaining(['users Eric', 'John', 'Apple', 'Car 2']))

  // remove
  db.remove('users', { name: 'Apple' })
  expect(_.map(db.getSubmits('users'), 'name')).toEqual(['Car 2'])
})
