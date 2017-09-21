import { createCollection } from '.'
import { garbageCollect } from './invalidate'
import { getState } from './base'
import { get, find, allPendings } from '..'

test('gc', async () => {
  const users = createCollection({
    name: 'users',
    onFetch: () => Promise.resolve([{ _id: 'b', name: 'b' }]),
    initState: {
      byId: { a: 'Hi' },
    },
    gcTime: 3600 * 1000,
  })

  // load will set _byIdAts
  expect(users._byIdAts).toEqual({ a: 1 })

  garbageCollect(users)
  // _byIdAts reduced
  expect(users._byIdAts).toEqual({ a: 0 })
  // a still in byId
  expect(getState(users)).toEqual({ byId: { a: 'Hi' }, originals: {}, fetchAts: {} })

  // set b's fetchAt
  get(users, 'b')
  find(users, { name: 'b' })
  await allPendings(users)

  // shorten the gcTime to force gc
  users.gcTime = 0
  garbageCollect(users)
  // gc will remove a and keep b, and remove related query
  expect(getState(users)).toEqual({ byId: { b: { _id: 'b', name: 'b' } }, originals: {}, fetchAts: {} })
  expect(Object.keys(users._byIdAts)).toEqual(['b'])
})
