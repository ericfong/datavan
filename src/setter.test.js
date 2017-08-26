import _ from 'lodash'
import Collection from './core/create'

it('insert & find', async () => {
  const collection = Collection({})

  const inserted = collection.insert([{ name: 'A' }, { name: 'B' }])
  expect(_.map(inserted, 'name')).toEqual(['A', 'B'])
  expect(_.map(collection.onGetAll(), 'name')).toEqual(['A', 'B'])

  expect(collection.find(_.map(inserted, '_id'))).toEqual(inserted)
})
