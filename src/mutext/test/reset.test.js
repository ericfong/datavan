import createDb from '../db'
import { echoValue } from './test-util'

test('reset', async () => {
  const onFetch = jest.fn(echoValue)
  const s = createDb({ users: { onFetch } })

  // fetch 'a'
  await s.users.findAsync(['a'])
  expect(s.users._byIdAts.a).toBeTruthy()

  s.users.reset()
  // preload still keep
  expect(s.users.getById()).toEqual({ a: 'A' })
  expect(s.users._byIdAts.a).toBeFalsy()

  // fetch 'b'
  await s.users.findAsync(['b']).then(arr => arr[0])

  s.users.reset()
  // preload still keep
  expect(s.users.getById()).toEqual({ a: 'A', b: 'B' })
  expect(s.users._byIdAts).toEqual({})

  // will re-fetch 'b'
  onFetch.mockClear()
  expect(onFetch).toHaveBeenCalledTimes(0)
  s.users.get('b')
  await s.users.getPending()
  expect(onFetch).toHaveBeenCalledTimes(1)

  // invalidate 'b'
  expect(s.users._byIdAts.b).toBeTruthy()
  s.users.invalidate(['b'])
  // preload still keep
  expect(s.users.getById()).toEqual({ a: 'A', b: 'B' })
  expect(s.users._byIdAts.b).toBeFalsy()

  // re-fetch 'b' after invalidate
  s.users.get('b')
  expect(onFetch).toHaveBeenCalledTimes(2)
})
