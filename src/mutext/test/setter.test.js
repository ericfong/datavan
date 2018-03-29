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
  store.users.mutate({ a: { $set: 1 }, old: { $set: { _id: 'old', name: 'new' } } })
  expect(store.users.getById()).toEqual({ a: 1, old: { _id: 'old', name: 'new' } })

  // mutate by string
  store.users.mutate('a', { $set: 2 })
  expect(store.users.getById().a).toEqual(2)

  // mutate by array of string
  store.users.mutate('old', 'name', { $set: 'new 2' })
  expect(store.users.getById().old.name).toEqual('new 2')
})

test('insert/create/set, originals will be persist', async () => {
  const store = createStore({ users: { onFetch: _.noop } })

  store.users.set('a', 'A')
  expect(_.keys(store.users.getOriginals())).toEqual(['a'])

  const persistedState = JSON.parse(JSON.stringify(store.users.getJson()))
  expect(_.keys(persistedState.originals)).toEqual(['a'])
})

test('insert & find', async () => {
  const store = createStore({ users: {} })

  const inserted = store.users.insert([{ name: 'A' }, { name: 'B' }])
  expect(_.map(inserted, 'name')).toEqual(['A', 'B'])
  expect(_.map(store.users.getById(), 'name')).toEqual(['A', 'B'])

  expect(store.users.find(_.map(inserted, '_id'))).toEqual(inserted)
})
