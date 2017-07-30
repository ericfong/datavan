import _ from 'lodash'
import { defineStore } from '.'
import Collection from './Collection'

it('query by array of ids', async () => {
  const createStore = defineStore({ users: Collection })
  const dv = createStore()
  const docs = dv.users.insert([{ name: 'A' }, { name: 'B' }])
  expect(dv.users.find(_.map(docs, '_id'))).toEqual(_.sortBy(docs, '_id'))
})

it('insert', async () => {
  const createStore = defineStore({
    users: Collection,
  })
  const dv = createStore()

  const docs = dv.users.insert([{ name: 'A' }, { name: 'B' }])
  expect(_.map(docs, 'name')).toEqual(['A', 'B'])
  expect(_.map(dv.users.getState(), 'name')).toEqual(['A', 'B'])
})
