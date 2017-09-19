import delay from 'delay'

import { createCollection } from '.'
import { garbageCollect } from './invalidate'
import { getState } from './base'
import { get, find, allPendings } from './fetcher'

test('gc', async () => {
  const users = createCollection({
    name: 'users',
    onFetch: () => Promise.resolve([{ _id: 'b', name: 'b' }]),
    initState: {
      byId: { a: 1 },
    },
    gcTime: 3600 * 1000,
  })

  // won't gc recent docs
  garbageCollect(users)
  expect(getState(users)).toEqual({ byId: { a: 1 }, originals: {}, requests: {} })

  // shorten the gcTime
  users.gcTime = 100
  await delay(users.gcTime)

  // set b's fetchAt
  get(users, 'b')
  find(users, { name: 'b' })
  await allPendings(users)

  // gc will remove a and keep b, and remove related query
  // TODO detect "Related" query
  garbageCollect(users)
  expect(getState(users)).toEqual({ byId: { b: { _id: 'b', name: 'b' } }, originals: {}, requests: { b: null } })
  expect(Object.keys(users._getAts)).toEqual(['b'])
  expect(Object.keys(users._findAts)).toEqual([])
})
