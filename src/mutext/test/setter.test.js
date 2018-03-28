import _ from 'lodash'

import createStore from '../store'

test('mutate', async () => {
  const store = createStore({
    users: {
      onFetch: _.noop,
      initState: { byId: { old: { _id: 'old', name: 'old' } } },
    },
  })

  // mutate to root
  store.db.users.mutate({ a: { $set: 1 }, old: { $set: { _id: 'old', name: 'new' } } })
  expect(store.db.users.getById()).toEqual({ a: 1, old: { _id: 'old', name: 'new' } })

  // mutate by string
  store.db.users.mutate('a', { $set: 2 })
  expect(store.db.users.getById().a).toEqual(2)

  // mutate by array of string
  store.db.users.mutate('old', 'name', { $set: 'new 2' })
  expect(store.db.users.getById().old.name).toEqual('new 2')
})

test('insert/create/set, originals will be persist', async () => {
  const store = createStore({ users: { onFetch: _.noop } })

  store.db.users.set('a', 'A')
  expect(_.keys(store.db.users.getOriginals())).toEqual(['a'])

  const persistedState = JSON.parse(JSON.stringify(store.db.users.getJson()))
  expect(_.keys(persistedState.originals)).toEqual(['a'])
})

test('insert & find', async () => {
  const store = createStore({ users: {} })

  const inserted = store.db.users.insert([{ name: 'A' }, { name: 'B' }])
  expect(_.map(inserted, 'name')).toEqual(['A', 'B'])
  expect(_.map(store.db.users.getById(), 'name')).toEqual(['A', 'B'])

  expect(store.db.users.find(_.map(inserted, '_id'))).toEqual(inserted)
})
