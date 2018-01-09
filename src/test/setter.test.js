import _ from 'lodash'

import { insert, set, setAll, getAll, getOriginals, find } from '..'
import createCollection from './util/createCollection'

test('insert/create/set, originals will be persist', async () => {
  const users = createCollection({ onFetch: _.noop })

  set(users, 'a', 'A')
  const state = users.getState()
  expect(_.keys(state.originals)).toEqual(['a'])

  const persistedState = JSON.parse(JSON.stringify(state))
  expect(_.keys(persistedState.originals)).toEqual(['a'])
})

test('setAll', async () => {
  const table = createCollection({ onFetch: _.noop, initState: { byId: { old: { _id: 'old', name: 'old' } } } })
  expect(getAll(table)).toEqual({ old: { _id: 'old', name: 'old' } })

  // first set
  setAll(table, { a: 1, old: { _id: 'old', name: 'new' } })
  expect(getAll(table)).toEqual({ a: 1, old: { _id: 'old', name: 'new' } })
  expect(getOriginals(table)).toEqual({ a: null, old: { _id: 'old', name: 'old' } })

  // set again
  setAll(table, { a: 2, old: { _id: 'old', name: 'new2' } })
  expect(getAll(table)).toEqual({ a: 2, old: { _id: 'old', name: 'new2' } })
  // originals will keep as first change
  expect(getOriginals(table)).toEqual({ a: null, old: { _id: 'old', name: 'old' } })
})

test('insert & find', async () => {
  const collection = createCollection({})

  const inserted = insert(collection, [{ name: 'A' }, { name: 'B' }])
  expect(_.map(inserted, 'name')).toEqual(['A', 'B'])
  expect(_.map(getAll(collection), 'name')).toEqual(['A', 'B'])

  expect(find(collection, _.map(inserted, '_id'))).toEqual(inserted)
})
