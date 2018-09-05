import _ from 'lodash'
import searchObjects from './searchObjects'

test('basic', async () => {
  const docs = [
    { name: 'Chan Tai Man' },
    { name: 'S4何香江' },
    { name: 'To To Wong' },
    { name: 'To Wong', mobile: '123456' },
    { name: 'Book', price: 12.3 },
    { name: 'Book S4', price: 12 },
  ]

  const defaultConf = ['name', 'mobile', 'price']
  const search = searchStr => _.map(searchObjects(docs, searchStr, defaultConf), 'name')

  expect(search('Ta Ma')).toEqual(['Chan Tai Man'])

  expect(search('To')).toEqual(['To Wong', 'To To Wong'])

  expect(search('To To')).toEqual(['To To Wong', 'To Wong'])

  expect(search('123456')).toEqual(['To Wong'])

  expect(search('何香江')).toEqual(['S4何香江'])

  expect(search('S4')).toEqual(['S4何香江', 'Book S4'])

  expect(search('12')).toEqual(['Book S4', 'Book', 'To Wong'])

  expect(searchObjects(null, '')).toEqual([])
  expect(searchObjects(docs, '')).toEqual(docs)
})
