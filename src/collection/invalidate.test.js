import { createCollection } from '.'
import { garbageCollect, invalidate } from './invalidate'
import { getState } from './base'
import { get, getAsync } from '..'
import { echoValue } from '../test/onFetchEcho'

test('only gc old docs but keep new docs', async () => {
  const onFetch = jest.fn(echoValue)
  const gcTime = 10000
  const users = createCollection({ onFetch, gcTime })

  // fetch 'a'
  await getAsync(users, 'a')
  const oldByIdAtA = users._byIdAts.a
  expect(oldByIdAtA).toBeTruthy()

  garbageCollect(users)
  // gc keep 'a'
  expect(getState(users).byId).toEqual({ a: 'A' })
  // _byIdAts.a reduced
  expect(users._byIdAts.a).toBe(oldByIdAtA)

  // make a become old enough to gc
  users._byIdAts.a -= gcTime

  // fetch 'b'
  await getAsync(users, 'b')

  // loop gc until drop 'a' but keep 'b'
  garbageCollect(users)
  expect(getState(users).byId).toEqual({ b: 'B' })

  // will not re-fetch 'b'
  onFetch.mockClear()
  expect(onFetch).toHaveBeenCalledTimes(0)
  get(users, 'b')
  expect(onFetch).toHaveBeenCalledTimes(0)

  // invalidate 'b'
  invalidate(users, ['b'])
  // 'b' remain
  expect(getState(users).byId).toEqual({ b: 'B' })
  // but No _byIdAts
  expect(users._byIdAts.b).toBeFalsy()

  // re-fetch 'b' after invalidate
  get(users, 'b')
  expect(onFetch).toHaveBeenCalledTimes(1)
})

test('gc', async () => {
  const users = createCollection({
    onFetch: echoValue,
    initState: {
      byId: { a: 'Hi' },
    },
    gcTime: -1,
  })

  garbageCollect(users)
  expect(getState(users).byId).toEqual({})
  expect('a' in users._byIdAts).toBeFalsy()
})
