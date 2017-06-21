![https://img.shields.io/npm/v/datavan.svg](https://img.shields.io/npm/v/datavan.svg?style=flat-square) [![state](https://img.shields.io/badge/state-alpha-green.svg?style=flat-square)]() [![npm](https://img.shields.io/npm/dt/datavan.svg?maxAge=2592000&style=flat-square)]() [![npm](https://img.shields.io/npm/l/datavan.svg?style=flat-square)]()

> mongo-like collections, can customize fetching and submiting logic to remote

__Features__
- based on redux (wrap redux into in-memory mongodb)
- can access regular http/async api (results are auto cached and auto gc)
- also work for sync datasource (ex: localStorage)
- designed for offline (conflict solve on your own)
- with Searchable mixin
- lightweight core and persistent on your own

__How It works?__

During collection.find() / .get(), datavan will check and call your onFetch function as a side effect unless cache is fresh. Fetched data will be cached into redux store.

Welcome to extend or hack datavan or other classes to change behaviours


__Table of Contents__
<!-- TOC START min:1 max:3 link:true update:true -->
  - [Usage](#usage)

<!-- TOC END -->





## Usage
```js
import { connect, defineStore, defineCollection, Provider } from 'datavan'

function PureComponent({ user }) {
  return <div>{(user && user.name) || 'No Name'}</div>
}

const MyApp = connect((dv, { username }) => {
  // redux mapState, but first argument is datavan store instead of dispatch
  // assume defined a collection called 'users', which can access by dv.users
  return {
    user: dv.users.findOne({ username }),
    // first call result will be undefined
    // after HTTP response and cached, connect will be re-run
    // so, second result will get user object
  }
})(PureComponent)


// Setup

const createStore = defineStore({
  users: defineCollection({
    onFetch(query, option) {
      return Promise.resolve([{ _id: 'id', name: 'loaded name' }])
    },
  }),
})

// regular redux's createStore
const store = createStore()

// Assign to your React context
render(
  <Provider store={store}>
    <MyApp />
  </Provider>
)
```
