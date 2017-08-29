// import _ from 'lodash'
import { createStore, combineReducers } from 'redux'
import { datavanReducer, datavanEnhancer, defineCollection, setOverrides, getStorePending } from '.'

const onFetch = () => Promise.resolve([])

test('null response', async () => {
  const Blogs = defineCollection({ name: 'blogs', onFetch: () => Promise.resolve(null) })
  const store = createStore(
    combineReducers({
      other: state => state || null,
      datavan: datavanReducer,
    }),
    { datavan: { blogs: { byId: { a: 123 } } } },
    datavanEnhancer
  )

  // trigger fetch null
  await Blogs(store).findAsync({})
  // wait for flush collection states to redux
  await getStorePending(store)

  expect(Blogs(store).getAll()).toEqual({ a: 123 })
  expect(Blogs(store).getState()).toEqual({ byId: { a: 123 }, requests: {}, originals: {} })
})

test('$request', async () => {
  const Roles = defineCollection({ name: 'roles' })
  const Blogs = defineCollection({ name: 'blogs', onFetch })
  const Users = defineCollection({
    name: 'users',
    onFetch: jest.fn(({ $request }) => {
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
    dependencies: [Roles, Blogs],
  })
  const store = datavanEnhancer(createStore)()
  // test setOverrides
  setOverrides(store, { roles: { onFetch } })

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
  expect(Roles(store).onGetAll()).toEqual({ 5: { _id: '5', role: 'reader' } })
  expect(Blogs(store).onGetAll()).toEqual({ 6: { _id: '6', title: 'How to use datavan', userId: '1' } })
})
