import { createStore } from 'redux'
import { datavanEnhancer, defineCollection, findAsync } from '..'
import onFetchEcho from '../test/onFetchEcho'

test('findAsync', async () => {
  const onFetch = jest.fn(onFetchEcho)
  const Users = defineCollection('users', { onFetch })
  const store = createStore(null, null, datavanEnhancer())

  expect(onFetch).toHaveBeenCalledTimes(0)
  expect(await findAsync(Users(store), ['a'])).toEqual([{ _id: 'a', name: 'A' }])
  expect(onFetch).toHaveBeenCalledTimes(1)

  // same query will hit cache
  await findAsync(Users(store), ['a'])
  expect(onFetch).toHaveBeenCalledTimes(1)

  // can force
  await findAsync(Users(store), ['a'], { force: true })
  expect(onFetch).toHaveBeenCalledTimes(2)
})
