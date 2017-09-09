import { createTable } from '.'
import { getAll } from './base'
import { load, loadAsDefaults, loadAsAssigns } from './load'

test('load', async () => {
  const users = createTable({})
  load(users, { byId: { a: { x: 1, y: 1 } } })
  expect(getAll(users)).toEqual({ a: { x: 1, y: 1 } })
  load(users, { byId: { a: { x: 2 } } })
  expect(getAll(users)).toEqual({ a: { x: 2 } })
  load(users, { byId: { a: { x: 3, y: 3 } } }, loadAsDefaults)
  expect(getAll(users)).toEqual({ a: { x: 2, y: 3 } })
  load(users, { byId: { a: { x: 4, y: 4 } } }, loadAsAssigns)
  expect(getAll(users)).toEqual({ a: { x: 4, y: 4 } })
})
