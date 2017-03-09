import batcher from './batcher'

global.__DEV__ = true

test('basic', async () => {
  const batch = batcher(argsArr => {
    return Promise.resolve(argsArr.map(([id]) => {
      return `Echo-${id}`
    }))
  })
  const rets = await Promise.all([
    batch('1', {load: true}),
    batch('2', {load: true}),
    batch('3', {load: true}),
  ])
  expect(rets).toEqual(['Echo-1', 'Echo-2', 'Echo-3'])
})
