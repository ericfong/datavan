import delay from 'delay'

import { createDb } from '..'
import { onFetchEcho, echoValue } from './test-util'

test('findAsync', async () => {
  const onFetch = jest.fn(onFetchEcho)
  const db = createDb({ users: { onFetch } })
  expect(onFetch).toHaveBeenCalledTimes(0)
  expect(await db.findAsync('users', ['a'])).toEqual([{ _id: 'a', name: 'A' }])
  expect(onFetch).toHaveBeenCalledTimes(1)
  // same query will hit cache
  await db.findAsync('users', ['a'])
  expect(onFetch).toHaveBeenCalledTimes(1)
  // can force
  await db.findAsync('users', ['a'], { force: true })
  expect(onFetch).toHaveBeenCalledTimes(2)
})

test('fetchMaxAge', async () => {
  const onFetch = jest.fn(echoValue)
  const db = createDb({
    users: {
      onFetch,
      initState: {
        byId: { a: { name: 'A' } },
        fetchAts: { '{}': Date.now() },
      },
      fetchMaxAge: 100,
    },
  })
  onFetch.mockClear()

  // all id is hit
  db.find('users', ['a'])
  expect(onFetch).toHaveBeenCalledTimes(0)
  // hit initState.fetchAts
  db.find('users', {})
  expect(onFetch).toHaveBeenCalledTimes(0)
  await delay(100)
  db.find('users', {})
  expect(onFetch).toHaveBeenCalledTimes(1)
  db.find('users', ['a'])
  expect(onFetch).toHaveBeenCalledTimes(2)
})
