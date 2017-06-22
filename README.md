![https://img.shields.io/npm/v/datavan.svg](https://img.shields.io/npm/v/datavan.svg?style=flat-square) [![state](https://img.shields.io/badge/state-alpha-green.svg?style=flat-square)]() [![npm](https://img.shields.io/npm/dt/datavan.svg?maxAge=2592000&style=flat-square)]() [![npm](https://img.shields.io/npm/l/datavan.svg?style=flat-square)]()

> mongo-like collections, can customize fetching and submiting logic to remote

__Features__
- based on redux (wrap redux into in-memory mongodb)
- can access regular http/async/promise api (results are auto cached and auto gc)
- already have reselect like memoize layer, don't need to think about createSelector
- also work for sync datasource (ex: localStorage)
- can be offline (conflict solve on your own)
- with Searchable mixin
- lightweight core and persistent on your own

__How It works?__

During collection.find() / .get(), datavan will check and call your onFetch function as a side effect unless cache is fresh. Fetched data will be cached into redux store.

Welcome to extend or hack datavan or other classes to change behaviours


__Table of Contents__
<!-- TOC START min:1 max:3 link:true update:true -->
  - [Usage](#usage)
  - [Server Rendering](#server-rendering)

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



## Server Rendering
```js
const MyApp = connect((dv, { username }) => {
  // following .find() .get() will be server preloaded (within this connect function)
  dv.serverPreload(true)
  return {
    user: dv.users.findOne({ username }),
  }
})(PureComponent)


// Provider and Store
const createServerStore = defineStore({
  users: defineCollection({
    onFetch(query, option) { /* server side implementation */ },
  }),
})
const serverStore = createServerStore()

// renderToString
const html = await serverStore.serverRender(() =>
  ReactDOMServer.renderToString(<Provider store={serverStore}><MyApp /></Provider>)
)
// transfer data to browser
const json = JSON.stringify(store.getState())

// -------

// browser side
const createBrowserStore = defineStore({
  users: defineCollection({
    onFetch(query, option) { /* browser side implementation */ },
  }),
})
const preloadedState = JSON.parse(json)
const browserStore = createBrowserStore(null, preloadedState)

ReactDOM.render(<Provider store={browserStore}><MyApp /></Provider>, dom)
```
You may use [iso](https://www.npmjs.com/package/iso) to ship data to browser
