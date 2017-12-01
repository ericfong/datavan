import { createStore } from 'redux'
import { datavanEnhancer, findAsync } from '..'
import onFetchEcho from '../test/onFetchEcho'

test('findAsync', async () => {
  const onFetch = jest.fn(onFetchEcho)
  const collections = { users: { onFetch } }
  const store = createStore(null, null, datavanEnhancer({ collections }))

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
