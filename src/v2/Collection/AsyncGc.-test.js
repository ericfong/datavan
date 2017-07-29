// test('gc', async () => {
//   const coll = new (defineCollection({
//     gcTime: 0,
//     onFetch: jest.fn(echoOnFetch),
//   }))({})
//   const gcSpy = jest.spyOn(coll, '_gc')
//
//   expect(await coll.findAsync(['db-1'])).toEqual([{ _id: 'db-1', name: 'Echo-db-1' }])
//   expect(gcSpy).toHaveBeenCalledTimes(1)
//
//   // db1 removed
//   await coll.findAsync(['db-2'])
//   expect(_.map(coll.getState(), '_id')).toEqual(['db-2'])
//   expect(gcSpy).toHaveBeenCalledTimes(2)
//
//   // re-fetch dc-1
//   expect(await coll.findAsync(['db-1'])).toEqual([{ _id: 'db-1', name: 'Echo-db-1' }])
//   expect(gcSpy).toHaveBeenCalledTimes(3)
// })
