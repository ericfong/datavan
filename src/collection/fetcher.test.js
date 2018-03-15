import delay from 'delay'
import { createStore } from 'redux'

import { createCollection, onFetchEcho, echoValue } from '../test/util'
import { find, datavanEnhancer, findAsync } from '..'

test('findAsync', async () => {
  const onFetch = jest.fn(onFetchEcho)
  const collections = { users: { onFetch } }
  const store = createStore(s => s || {}, null, datavanEnhancer({ collections }))

  expect(onFetch).toHaveBeenCalledTimes(0)
  expect(await findAsync(store, 'users', ['a'])).toEqual([{ _id: 'a', name: 'A' }])
  expect(onFetch).toHaveBeenCalledTimes(1)

  // same query will hit cache
  await findAsync(store, 'users', ['a'])
  expect(onFetch).toHaveBeenCalledTimes(1)

  // can force
  await findAsync(store, 'users', ['a'], { force: true })
  expect(onFetch).toHaveBeenCalledTimes(2)
})

test('fetchMaxAge', async () => {
  const onFetch = jest.fn(echoValue)
  const users = createCollection({
    onFetch,
    initState: {
      byId: { a: { name: 'A' } },
      fetchAts: { [`query=${encodeURIComponent('{}')}`]: Date.now() },
    },
    fetchMaxAge: 100,
  })

  onFetch.mockClear()

  // all id is hit
  find(users, ['a'])
  expect(onFetch).toHaveBeenCalledTimes(0)

  // hit initState.fetchAts
  find(users, {})
  expect(onFetch).toHaveBeenCalledTimes(0)

  await delay(100)
  find(users, {})
  expect(onFetch).toHaveBeenCalledTimes(1)
  find(users, ['a'])
  expect(onFetch).toHaveBeenCalledTimes(2)
})
