import delay from 'delay'
import createCollection from '../test/createCollection'
import { find } from '..'
import { echoValue } from '../test/onFetchEcho'

test('fetchMaxAge', async () => {
  const onFetch = jest.fn(echoValue)
  const users = createCollection({
    onFetch,
    initState: {
      byId: { a: { name: 'A' } },
      fetchAts: { '[{},{}]': Date.now() },
    },
    fetchMaxAge: 100,
  })

  onFetch.mockClear()
  expect(onFetch).toHaveBeenCalledTimes(0)

  find(users, ['a'])
  expect(onFetch).toHaveBeenCalledTimes(0)
  find(users, {})
  expect(onFetch).toHaveBeenCalledTimes(0)

  await delay(100)
  find(users, {})
  expect(onFetch).toHaveBeenCalledTimes(1)
  find(users, ['a'])
  expect(onFetch).toHaveBeenCalledTimes(2)
})
