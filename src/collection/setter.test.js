import _ from 'lodash'

import { insert, set, getAll, find, mutate } from '..'
import { createCollection } from '../test/util'

test('mutate', async () => {
  const table = createCollection({
    onFetch: _.noop,
    initState: { byId: { old: { _id: 'old', name: 'old' } } },
  })

  // mutate to root
  mutate(table, { a: { $set: 1 }, old: { $set: { _id: 'old', name: 'new' } } })
  expect(getAll(table)).toEqual({ a: 1, old: { _id: 'old', name: 'new' } })

  // mutate by string
  mutate(table, 'a', { $set: 2 })
  expect(getAll(table).a).toEqual(2)

  // mutate by array of string
  mutate(table, ['old', 'name'], { $set: 'new 2' })
  expect(getAll(table).old.name).toEqual('new 2')
})

test('insert/create/set, originals will be persist', async () => {
  const users = createCollection({ onFetch: _.noop })

  set(users, 'a', 'A')
  const state = users.getState()
  expect(_.keys(state.originals)).toEqual(['a'])

  const persistedState = JSON.parse(JSON.stringify(state))
  expect(_.keys(persistedState.originals)).toEqual(['a'])
})

test('insert & find', async () => {
  const collection = createCollection({})

  const inserted = insert(collection, [{ name: 'A' }, { name: 'B' }])
  expect(_.map(inserted, 'name')).toEqual(['A', 'B'])
  expect(_.map(getAll(collection), 'name')).toEqual(['A', 'B'])

  expect(find(collection, _.map(inserted, '_id'))).toEqual(inserted)
})
