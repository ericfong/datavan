import { processOption } from './findInState'

test('processOption', async () => {
  expect(processOption(
    [
      {
        key: 'x-key',
        value: 'x-val',
      },
      {
        key: 'y-key',
        value: 'y-val',
      },
    ],
    { keyBy: 'key', keyByValue: 'value' }
  )).toEqual({ 'x-key': 'x-val', 'y-key': 'y-val' })
})
