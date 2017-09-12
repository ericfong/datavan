import _ from 'lodash'
import { find } from '..'
import { createCollection } from '../collection'
import plugSearchable from './searchable'

test('basic', async () => {
  const users = createCollection(
    plugSearchable({ fields: ['name', 'mobile', 'price'] })({
      initState: [
        { name: 'Chan Tai Man' },
        { name: 'S4何香江' },
        { name: 'To To Wong' },
        { name: 'To Wong', mobile: '123456' },
        { name: 'Book', price: 12.3 },
        { name: 'Book S4', price: 12 },
      ],
    })
  )

  expect(_.map(find(users, { $search: 'Ta Ma' }), 'name')).toEqual(['Chan Tai Man'])

  expect(_.map(find(users, { $search: 'To' }), 'name')).toEqual(['To Wong', 'To To Wong'])

  expect(_.map(find(users, { $search: 'To To' }), 'name')).toEqual(['To To Wong', 'To Wong'])

  expect(_.map(find(users, { $search: '123456' }), 'name')).toEqual(['To Wong'])

  expect(_.map(find(users, { $search: '何香江' }), 'name')).toEqual(['S4何香江'])

  expect(_.map(find(users, { $search: 'S4' }), 'name')).toEqual(['S4何香江', 'Book S4'])

  expect(_.map(find(users, { $search: '12' }), 'name')).toEqual(['Book S4', 'Book', 'To Wong'])
})
