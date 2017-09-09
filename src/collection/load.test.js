import { createCollection } from '.'
import { getAll } from './base'
import { load, loadAsDefaults } from './load'

test('load', async () => {
  const users = createCollection({})
  load(users, { byId: { a: { x: 1, y: 1 } } })
  expect(getAll(users)).toEqual({ a: { x: 1, y: 1 } })
  load(users, { byId: { a: { x: 2 } } })
  expect(getAll(users)).toEqual({ a: { x: 2, y: 1 } })
  load(users, { byId: { a: { x: 3, y: 3, z: 3 } } }, { loadAs: loadAsDefaults })
  expect(getAll(users)).toEqual({ a: { x: 2, y: 1, z: 3 } })
})
