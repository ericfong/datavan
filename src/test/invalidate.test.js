import createCollection from './util/createCollection'
import { getAll, garbageCollect, invalidate, get, getAsync, INVALIDATE_EXPIRED } from '..'
import { echoValue } from './util/onFetchEcho'

// import { printTimes } from '../datavanEnhancer'
//
// afterAll(printTimes)

test('gc for collection without onFetch', async () => {
  const users = createCollection({ initState: { byId: { a: 'Hi' } }, gcTime: -1 })
  garbageCollect(users)
  expect(getAll(users)).toEqual({ a: 'Hi' })
  expect('a' in users._byIdAts).toBeTruthy()
})

test('only gc old docs but keep new docs', async () => {
  const onFetch = jest.fn(echoValue)
  const gcTime = 10000
  const users = createCollection({ onFetch, gcTime })

  // fetch 'a'
  await getAsync(users, 'a')
  const oldByIdAtA = users._byIdAts.a
  expect(oldByIdAtA).toBeTruthy()

  garbageCollect(users, INVALIDATE_EXPIRED)
  // gc keep 'a'
  expect(getAll(users)).toEqual({ a: 'A' })
  // _byIdAts.a reduced
  expect(users._byIdAts.a).toBe(oldByIdAtA)

  // make a become old enough to gc
  users._byIdAts.a -= gcTime

  // fetch 'b'
  await getAsync(users, 'b')

  // loop gc until drop 'a' but keep 'b'
  garbageCollect(users, INVALIDATE_EXPIRED)
  expect(getAll(users)).toEqual({ b: 'B' })

  // will not re-fetch 'b'
  onFetch.mockClear()
  expect(onFetch).toHaveBeenCalledTimes(0)
  get(users, 'b')
  expect(onFetch).toHaveBeenCalledTimes(0)

  // invalidate 'b'
  invalidate(users, ['b'])
  // 'b' remain
  expect(getAll(users)).toEqual({ b: 'B' })
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
  expect(getAll(users)).toEqual({})
  expect('a' in users._byIdAts).toBeFalsy()
})
