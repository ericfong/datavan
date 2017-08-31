import delay from 'delay'

import { createTable } from '../table'
import { gcTable } from './gc'
import { getState } from '../state'
import { get, allPendings } from '../fetcher'

test('gc', async () => {
  const users = createTable({
    name: 'users',
    onFetch: () => Promise.resolve([{ _id: 'b', name: 'b' }]),
    _pendingState: {
      byId: { a: 1 },
    },
    gcTime: 3600 * 1000,
  })

  // won't gc recent docs
  expect(gcTable(users)).toBe(true)
  expect(getState(users)).toEqual({ byId: { a: 1 }, originals: {}, requests: {} })

  // shorten the gcTime
  users.gcTime = 100
  await delay(users.gcTime)

  // set b's fetchAt
  get(users, 'b')
  await allPendings(users)

  // gc will remove a and keep b
  expect(gcTable(users)).toBe(true)
  expect(getState(users)).toEqual({ byId: { b: { _id: 'b', name: 'b' } }, originals: {}, requests: {} })
})
