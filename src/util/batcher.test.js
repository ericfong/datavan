// import _ from 'lodash'
import batcher from './batcher'

// test('batchIdQuery', async () => {
//   const batchIdQuery = makeBatchIdQuery()
//   const actualFetch = jest.fn(query => Promise.resolve(_.map(query, _id => ({ _id, name: `name-${_id}` }))))
//   const onFetch = joinMiddlewares(batchIdQuery, actualFetch)
//   const ret = await Promise.all([onFetch(['id-1'], {}), onFetch(['id-2'], {})])
//   expect(ret).toEqual([{ _id: 'id-1', name: 'name-id-1' }, { _id: 'id-2', name: 'name-id-2' }])
//   expect(actualFetch).toHaveBeenCalledTimes(1)
//   expect(actualFetch.mock.calls[0][0]).toEqual(['id-1', 'id-2'])
// })

// test('joinMiddlewares', async () => {
//   const echo = jest.fn((query, option, next) => next({ ...query, echo: query.echo + 1 }, option))
//   const onFetch = joinMiddlewares(echo, echo, (query, option) => [query, option])
//
//   const ret = onFetch({ _id: '1', echo: 0 }, { sort: { time: 1 } })
//   expect(ret).toEqual([{ _id: '1', echo: 2 }, { sort: { time: 1 } }])
//
//   expect(echo).toHaveBeenCalledTimes(2)
//   expect(echo.mock.calls[0][0]).toEqual({ _id: '1', echo: 0 })
//   expect(echo.mock.calls[0][1]).toEqual({ sort: { time: 1 } })
//   expect(echo.mock.calls[1][0]).toEqual({ _id: '1', echo: 1 })
//   expect(echo.mock.calls[1][1]).toEqual({ sort: { time: 1 } })
// })

test('batcher', async () => {
  const batch = batcher(calls => {
    return Promise.resolve(calls.map(([id]) => `Echo-${id}`))
  })
  const rets = await Promise.all([batch('1'), batch('2'), batch('3')])
  expect(rets).toEqual(['Echo-1', 'Echo-2', 'Echo-3'])
})
