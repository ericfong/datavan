import createDb from '../db'
import { echoValue } from './test-util'

test('reset', async () => {
  const onFetch = jest.fn(echoValue)
  const s = createDb({ users: { onFetch } })

  // fetch 'a'
  await s.findAsync('users', ['a'])
  expect(s.users._byIdAts.a).toBeTruthy()

  s.reset('users')
  // preload invalidated
  expect(s.getById('users')).toEqual({})
  expect(s.users._byIdAts.a).toBeFalsy()

  // fetch 'b'
  await s.findAsync('users', ['b']).then(arr => arr[0])

  s.reset('users')
  // preload invalidated
  expect(s.getById('users')).toEqual({})
  expect(s.users._byIdAts).toEqual({})

  // will re-fetch 'b'
  onFetch.mockClear()
  expect(onFetch).toHaveBeenCalledTimes(0)
  s.find('users', ['b', 'c'])
  await s.getPending('users')
  expect(onFetch).toHaveBeenCalledTimes(1)

  // invalidate 'b'
  expect(s.users._byIdAts.b).toBeTruthy()
  s.invalidate('users', ['b'])
  // preload invalidated
  expect(s.getById('users')).toEqual({ c: 'C' })
  expect(s.users._byIdAts.b).toBeFalsy()

  // re-fetch 'b' after invalidate
  s.get('users', 'b')
  expect(onFetch).toHaveBeenCalledTimes(2)
})
