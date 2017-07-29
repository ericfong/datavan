import _ from 'lodash'
import SyncTable from '.'

it('insert & find', async () => {
  const table = SyncTable({})

  const inserted = table.insert([{ name: 'A' }, { name: 'B' }])
  expect(_.map(inserted, 'name')).toEqual(['A', 'B'])
  expect(_.map(table.getData(), 'name')).toEqual(['A', 'B'])

  expect(table.find(_.map(inserted, '_id'))).toEqual(inserted)
})
