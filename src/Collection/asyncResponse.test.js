// import _ from 'lodash'
import { createStore } from 'redux'
import createEnhancer, { collect } from '../createEnhancer'

const onFetch = () => Promise.resolve([])

test('$request', async () => {
  const Users = collect('users')
  const Roles = collect('roles')
  const Blogs = collect('blogs')
  const adapters = {
    users: {
      onFetch: jest.fn((collection, { $request }) => {
        if ($request === 'request-only-aggregate-count') {
          return Promise.resolve({ $request: [$request, 100000] })
        }
        if ($request === 'complex-query-1') {
          return Promise.resolve([{ _id: '1', age: 10 }, { _id: '2', gender: 'M' }, { _id: '3', name: 'not-related' }])
        }
        if ($request === 'complex-query-2') {
          return Promise.resolve({
            $byId: {
              4: { _id: '4', age: 20, roleId: '2' },
            },
            $relations: {
              roles: [{ _id: '5', role: 'reader' }],
              blogs: [{ _id: '6', title: 'How to use datavan', userId: '1' }],
            },
          })
        }
      }),
    },
    roles: { onFetch },
    blogs: { onFetch },
  }
  const store = createEnhancer(adapters)(createStore)()

  // $request only
  expect(await Users(store).findAsync({ $request: 'request-only-aggregate-count' })).toEqual(['request-only-aggregate-count', 100000])

  // complex query 1
  const complexQuery = { $or: [{ age: 10 }, { gender: 'M' }], $request: 'complex-query-1' }
  Users(store).find(complexQuery)
  await Promise.all(Users(store).allPendings())
  expect(Users(store).find(complexQuery, { sort: { _id: 1 } })).toEqual([{ _id: '1', age: 10 }, { _id: '2', gender: 'M' }])

  // complex query 2
  const complexQuery2 = { age: 20, $request: 'complex-query-2' }
  Users(store).find(complexQuery2)
  await Promise.all(Users(store).allPendings())
  expect(Users(store).find(complexQuery2)).toEqual([{ _id: '4', age: 20, roleId: '2' }])
  expect(Roles(store).getData()).toEqual({ 5: { _id: '5', role: 'reader' } })
  expect(Blogs(store).getData()).toEqual({ 6: { _id: '6', title: 'How to use datavan', userId: '1' } })
})
