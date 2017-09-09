import _ from 'lodash'
import { createCollection } from '.'

import { getState } from './base'
import { setAll } from './setter'

test('setAll', async () => {
  const table = createCollection({ onFetch: _.noop, _pendingState: { byId: { old: { _id: 'old', name: 'old' } } } })

  // first set
  setAll(table, { a: 1, old: { _id: 'old', name: 'new' } })
  expect(getState(table).byId).toEqual({ a: 1, old: { _id: 'old', name: 'new' } })
  expect(getState(table).originals).toEqual({ a: undefined, old: { _id: 'old', name: 'old' } })

  // set again
  setAll(table, { a: 2, old: { _id: 'old', name: 'new2' } })
  expect(getState(table).byId).toEqual({ a: 2, old: { _id: 'old', name: 'new2' } })
  // originals will keep as first change
  expect(getState(table).originals).toEqual({ a: undefined, old: { _id: 'old', name: 'old' } })
})

it('insert & find', async () => {
  const collection = createCollection({})

  const inserted = collection.insert([{ name: 'A' }, { name: 'B' }])
  expect(_.map(inserted, 'name')).toEqual(['A', 'B'])
  expect(_.map(collection.onGetAll(), 'name')).toEqual(['A', 'B'])

  expect(collection.find(_.map(inserted, '_id'))).toEqual(inserted)
})
