import _ from 'lodash'

import createDb from '../db'

test('mutate', async () => {
  const db = createDb({
    users: {
      onFetch: _.noop,
      initState: { byId: { old: { _id: 'old', name: 'old' } } },
    },
  })

  // mutate to root
  db.mutate('users', { a: { $set: 1 }, old: { $set: { _id: 'old', name: 'new' } } })
  expect(db.getById('users')).toEqual({ a: 1, old: { _id: 'old', name: 'new' } })

  // mutate by string
  db.mutate('users', 'a', { $set: 2 })
  expect(db.getById('users').a).toEqual(2)

  // mutate by array of string
  db.mutate('users', 'old', 'name', { $set: 'new 2' })
  expect(db.getById('users').old.name).toEqual('new 2')
})

test('insert/create/set, originals will be persist', async () => {
  const db = createDb({ users: { onFetch: _.noop } })

  db.set('users', 'a', 'A')
  expect(_.keys(db.getOriginals('users'))).toEqual(['a'])

  // const persistedState = JSON.parse(JSON.stringify(db.users.getJson()))
  // expect(_.keys(persistedState.originals)).toEqual(['a'])
})

test('insert & find', async () => {
  const db = createDb({ users: {} })

  const inserted = db.insert('users', [{ name: 'A' }, { name: 'B' }])
  expect(_.map(inserted, 'name')).toEqual(['A', 'B'])
  expect(_.map(db.getById('users'), 'name')).toEqual(['A', 'B'])

  expect(db.find('users', _.map(inserted, '_id'))).toEqual(inserted)
})
