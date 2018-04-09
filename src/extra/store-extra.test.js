import _ from 'lodash'
import { createStore } from 'redux'
import { datavanEnhancer, loadCollections, getPending, find, getAll } from '..'

const onFetch = () => Promise.resolve([])

test('$relations', async () => {
  const store = createStore(
    s => s || {},
    null,
    datavanEnhancer({
      collections: {
        roles: { idField: 'role', onFetch },
        blogs: { onFetch },
        users: {
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
        },
      },
    })
  )

  // complex query 1
  const query1 = { $or: [{ age: 10 }, { gender: 'M' }] }
  find(store, 'users', query1, {
    fetchUrl: 'complex-query-1',
  })
  await getPending(store, 'users')
  expect(_.sortBy(
    find(store, 'users', query1, {
      fetchUrl: 'complex-query-1',
    }),
    '_id'
  )).toEqual([{ _id: '1', age: 10 }, { _id: '2', gender: 'M' }])

  // complex query 2
  const query2 = { age: 20 }
  find(store, 'users', query2, { fetchUrl: 'complex-query-2' })
  await getPending(store, 'users')
  expect(find(store, 'users', query2, { fetchUrl: 'complex-query-2' })).toEqual([{ _id: '4', age: 20, roleId: '2' }])
  expect(getAll(store, 'roles')).toEqual({ reader: { role: 'reader' } })
  expect(getAll(store, 'blogs')).toEqual({
    6: { _id: '6', title: 'How to use datavan', userId: '1' },
  })
})
