// import _ from 'lodash'
import { createStore } from 'redux'
import { datavanEnhancer, defineCollection, setOverrides, loadCollections } from '..'

const onFetch = () => Promise.resolve([])

// re-enable this in future?
test.skip('$request', async () => {
  let store
  const Roles = defineCollection({ name: 'roles', idField: 'role' })
  const Blogs = defineCollection({ name: 'blogs', onFetch })
  const Users = defineCollection({
    name: 'users',
    onFetch: jest.fn(({ $request }, { fetchKey }) => {
      if ($request === 'request-only-aggregate-count') {
        return Promise.resolve({
          requests: {
            [fetchKey]: [$request, 100000],
          },
        })
      }
      if ($request === 'complex-query-1') {
        return Promise.resolve([{ _id: '1', age: 10 }, { _id: '2', gender: 'M' }, { _id: '3', name: 'not-related' }])
      }
      if ($request === 'complex-query-2') {
        return Promise.resolve({
          byId: {
            4: { _id: '4', age: 20, roleId: '2' },
          },
          $relations: {
            roles: [{ role: 'reader' }],
            blogs: [{ _id: '6', title: 'How to use datavan', userId: '1' }],
          },
        }).then(res => {
          loadCollections(store, res.$relations)
          return res
        })
      }
    }),
    dependencies: [Roles, Blogs],
  })
  store = createStore(null, null, datavanEnhancer())
  // test setOverrides
  setOverrides(store, { roles: { onFetch } })

  // $request only
  expect(await Users(store).findAsync({ $request: 'request-only-aggregate-count' })).toEqual(['request-only-aggregate-count', 100000])

  expect(Roles(store).idField).toBe('role')

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
  expect(Roles(store).onGetAll()).toEqual({ reader: { role: 'reader' } })
  expect(Blogs(store).onGetAll()).toEqual({ 6: { _id: '6', title: 'How to use datavan', userId: '1' } })
})
