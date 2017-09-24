import { createCollection } from '.'
import { garbageCollect, GC_GENERATION, invalidate } from './invalidate'
import { getState } from './base'
import { get, getAsync } from '..'
import { echoValue } from '../test/onFetchEcho'

test('only gc old docs but keep new docs', async () => {
  const onFetch = jest.fn(echoValue)
  const users = createCollection({ onFetch, gcTime: 0 })

  // fetch 'a'
  await getAsync(users, 'a')
  const oldByIdAtA = users._byIdAts.a
  expect(oldByIdAtA).toBeTruthy()

  garbageCollect(users)
  // gc keep 'a'
  expect(getState(users).byId).toEqual({ a: 'A' })
  // _byIdAts.a reduced
  expect(users._byIdAts.a).toBeLessThan(oldByIdAtA)

  // fetch 'b'
  await getAsync(users, 'b')

  // loop gc until drop 'a' but keep 'b'
  for (let i = 1; i < GC_GENERATION; i++) garbageCollect(users)
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
    gcTime: 3600 * 1000,
  })

  for (let i = 0; i < GC_GENERATION; i++) garbageCollect(users)
  expect(getState(users).byId).toEqual({})
  expect('a' in users._byIdAts).toBeFalsy()
})
