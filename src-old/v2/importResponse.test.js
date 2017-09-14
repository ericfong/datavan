// import _ from 'lodash'
import { createStore, combineReducers } from 'redux'
import { datavanReducer, datavanEnhancer, defineCollection, getStorePending } from '..'

test('null response', async () => {
  const Blogs = defineCollection({ name: 'blogs', onFetch: () => Promise.resolve(null) })
  const store = createStore(
    combineReducers({
      other: state => state || null,
      datavan: datavanReducer,
    }),
    { datavan: { blogs: { byId: { a: 123 } } } },
    datavanEnhancer()
  )

  // trigger fetch null
  await Blogs(store).findAsync({})
  // wait for flush collection states to redux
  await getStorePending(store)

  expect(Blogs(store).getAll()).toEqual({ a: 123 })
  expect(Blogs(store).getState()).toEqual({ byId: { a: 123 }, requests: {}, originals: {} })
})
