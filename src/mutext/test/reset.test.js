import createStore from '../store'
import { echoValue } from './test-util'

test('reset', async () => {
  const onFetch = jest.fn(echoValue)
  const s = createStore({ users: { onFetch } })

  // fetch 'a'
  await s.db.users.findAsync(['a'])
  expect(s.db.users._byIdAts.a).toBeTruthy()

  s.db.users.reset()
  // preload still keep
  expect(s.db.users.getById()).toEqual({ a: 'A' })
  expect(s.db.users._byIdAts.a).toBeFalsy()

  // fetch 'b'
  await s.db.users.findAsync(['b']).then(arr => arr[0])

  s.db.users.reset()
  // preload still keep
  expect(s.db.users.getById()).toEqual({ a: 'A', b: 'B' })
  expect(s.db.users._byIdAts).toEqual({})

  // will re-fetch 'b'
  onFetch.mockClear()
  expect(onFetch).toHaveBeenCalledTimes(0)
  s.db.users.get('b')
  await s.db.users.getPending()
  expect(onFetch).toHaveBeenCalledTimes(1)

  // invalidate 'b'
  expect(s.db.users._byIdAts.b).toBeTruthy()
  s.db.users.invalidate(['b'])
  // preload still keep
  expect(s.db.users.getById()).toEqual({ a: 'A', b: 'B' })
  expect(s.db.users._byIdAts.b).toBeFalsy()

  // re-fetch 'b' after invalidate
  s.db.users.get('b')
  expect(onFetch).toHaveBeenCalledTimes(2)
})
