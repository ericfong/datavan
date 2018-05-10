import { createBatchMemoizer } from './cache-util'

test('createBatchMemoizer even inline func can be cached', async () => {
  const memoizer = createBatchMemoizer()

  let runCount = 0

  const r1 = memoizer.newBatch({}).memoize(() => {
    runCount++
    return { x: [] }
  })
  const r2 = memoizer.newBatch({}).memoize(() => {
    runCount++
    return { x: [] }
  })

  expect(r1.x).toBe(r2.x)
  expect(runCount).toBe(1)
})
