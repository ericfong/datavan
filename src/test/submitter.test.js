import _ from 'lodash'
import createCollection from './util/createCollection'
import { getSubmits, findOne, getPending, insert, update, remove, get, getAll } from '..'

function onFetch(query, option, collection) {
  if (Array.isArray(query)) {
    return Promise.resolve(_.map(query, id => ({ id, name: 'John' })))
  }
  return Promise.resolve([{ id: 'u2', name: `${collection.name} Eric` }])
}

test('basic', async () => {
  const Users = createCollection({
    name: 'users',
    idField: 'id',
    onFetch,
  })

  insert(Users, { name: 'Apple' })
  insert(Users, { name: 'Car' })
  expect(_.map(getAll(Users), 'name')).toEqual(['Apple', 'Car'])
  expect(_.map(getSubmits(Users), 'name')).toEqual(['Apple', 'Car'])

  // find and update
  const car = findOne(Users, { name: 'Car' })
  update(Users, { id: car.id }, { $merge: { name: 'Car 2' } })
  expect(_.map(getSubmits(Users), 'name')).toEqual(['Apple', 'Car 2'])

  // mix data from server
  get(Users, 'u1')
  await getPending(Users)
  expect(_.map(getAll(Users), 'name')).toEqual(expect.arrayContaining(['users Eric', 'John', 'Apple', 'Car 2']))

  // remove
  remove(Users, { name: 'Apple' })
  expect(_.map(getSubmits(Users), 'name')).toEqual([undefined, 'Car 2'])
})
