import delay from 'delay'

import { createDb } from '..'
import { onFetchEcho, echoValue } from './test-util'

test('findAsync', async () => {
  const onFetch = jest.fn(onFetchEcho)
  const db = createDb({ users: { onFetch } })
  expect(onFetch).toHaveBeenCalledTimes(0)
  expect(await db.users.findAsync(['a'])).toEqual([{ _id: 'a', name: 'A' }])
  expect(onFetch).toHaveBeenCalledTimes(1)
  // same query will hit cache
  await db.users.findAsync(['a'])
  expect(onFetch).toHaveBeenCalledTimes(1)
  // can force
  await db.users.findAsync(['a'], { force: true })
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
  db.users.find(['a'])
  expect(onFetch).toHaveBeenCalledTimes(0)
  // hit initState.fetchAts
  db.users.find({})
  expect(onFetch).toHaveBeenCalledTimes(0)
  await delay(100)
  db.users.find({})
  expect(onFetch).toHaveBeenCalledTimes(1)
  db.users.find(['a'])
  expect(onFetch).toHaveBeenCalledTimes(2)
})
