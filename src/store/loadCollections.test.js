// import _ from 'lodash'
import { createStore } from 'redux'
import { datavanEnhancer, defineCollection, setOverrides, loadCollections, allPendings } from '..'

const onFetch = () => Promise.resolve([])

test('$relations', async () => {
  let store
  const Roles = defineCollection({ name: 'roles', idField: 'role' })
  const Blogs = defineCollection({ name: 'blogs', onFetch })
  const Users = defineCollection({
    name: 'users',
    onFetch: jest.fn((query, { fetchUrl }) => {
      if (fetchUrl === 'complex-query-1') {
        return [{ _id: '1', age: 10 }, { _id: '2', gender: 'M' }, { _id: '3', name: 'not-related' }]
      }
      if (fetchUrl === 'complex-query-2') {
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
  setOverrides(store, { roles: { onFetch } })

  // complex query 1
  const query1 = { $or: [{ age: 10 }, { gender: 'M' }] }
  Users(store).find(query1, { fetchUrl: 'complex-query-1', sort: { _id: 1 } })
  await Promise.all(allPendings(Users(store)))
  expect(Users(store).find(query1, { fetchUrl: 'complex-query-1', sort: { _id: 1 } })).toEqual([{ _id: '1', age: 10 }, { _id: '2', gender: 'M' }])

  // complex query 2
  const query2 = { age: 20 }
  Users(store).find(query2, { fetchUrl: 'complex-query-2' })
  await Promise.all(allPendings(Users(store)))
  expect(Users(store).find(query2, { fetchUrl: 'complex-query-2' })).toEqual([{ _id: '4', age: 20, roleId: '2' }])
  expect(Roles(store).onGetAll()).toEqual({ reader: { role: 'reader' } })
  expect(Blogs(store).onGetAll()).toEqual({ 6: { _id: '6', title: 'How to use datavan', userId: '1' } })
})
