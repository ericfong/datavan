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
  db.users.mutate({ a: { $set: 1 }, old: { $set: { _id: 'old', name: 'new' } } })
  expect(db.users.getById()).toEqual({ a: 1, old: { _id: 'old', name: 'new' } })

  // mutate by string
  db.users.mutate('a', { $set: 2 })
  expect(db.users.getById().a).toEqual(2)

  // mutate by array of string
  db.users.mutate('old', 'name', { $set: 'new 2' })
  expect(db.users.getById().old.name).toEqual('new 2')
})

test('insert/create/set, originals will be persist', async () => {
  const db = createDb({ users: { onFetch: _.noop } })

  db.users.set('a', 'A')
  expect(_.keys(db.users.getOriginals())).toEqual(['a'])

  const persistedState = JSON.parse(JSON.stringify(db.users.getJson()))
  expect(_.keys(persistedState.originals)).toEqual(['a'])
})

test('insert & find', async () => {
  const db = createDb({ users: {} })

  const inserted = db.users.insert([{ name: 'A' }, { name: 'B' }])
  expect(_.map(inserted, 'name')).toEqual(['A', 'B'])
  expect(_.map(db.users.getById(), 'name')).toEqual(['A', 'B'])

  expect(db.users.find(_.map(inserted, '_id'))).toEqual(inserted)
})
