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
- [Getting Started](#getting-started)
- [Server Rendering](#server-rendering)
- [API Reference](#api-reference)
  - [Definitions](#definitions)
    - [defineStore(definitions)](#definestoredefinitions)
    - [createStore(reducer, preloadedState, enhancer)](#createstorereducer-preloadedstate-enhancer)
    - [defineCollection(...mixins)](#definecollectionmixins)
  - [Connect with React](#connect-with-react)
    - [connect(mapPropsFunc, mapActionsFunc)](#connectmappropsfunc-mapactionsfunc)
    - [Provider Component](#provider-component)
    - [createDatavanEnhancer(definitions)](#createdatavanenhancerdefinitions)
  - [Classes for directly use](#classes-for-directly-use)
    - [Browser Class](#browser-class)
    - [LocalStorage Class](#localstorage-class)
    - [SessionStorage Class](#sessionstorage-class)
    - [Cookie Class](#cookie-class)
    - [KoaCookie Class](#koacookie-class)
    - [Searchable Class](#searchable-class)
  - [Classes for extend](#classes-for-extend)
    - [KeyValueStore Class](#keyvaluestore-class)
    - [Collection Class](#collection-class)
    - [FetchingCollection Class](#fetchingcollection-class)
    - [SubmittingCollection Class](#submittingcollection-class)
  - [Util functions](#util-functions)
    - [getSetters(...names)](#getsettersnames)
    - [composeClass(...mixins)](#composeclassmixins)
    - [search(docs, keywordStr, getSearchFields)](#searchdocs-keywordstr-getsearchfields)

<!-- TOC END -->





# Getting Started
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





# Server Rendering
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





# API Reference
datavan exported the following functions or classes. You can use ```import { XX } from 'datavan'``` to import.

## Definitions

### defineStore(definitions)
create store factory function by collection definitions
```js
const createStore = defineStore({
  // input table of collection definitions
  users: Class/Factory/Prototype,  // can use defineCollection({ ... }) to define collection class
})
// create store instance and all collection instances
const store = createStore()
// access collection instance 'users'
store.users.find()
```
- if definition is Class, will be new by `new Class(preloadedState)`
- if definition is Factory function, will be called by `factory(preloadedState)`
- if definition is Prototype object, will be `newObj = Object.create(definition)` and `newObj.constructor(preloadedState)`


### createStore(reducer, preloadedState, enhancer)
enhanced createStore that generated by defineStore or datavanEnhancer

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| reducer | `function` | `undefined` | regular redux reducer |
| preloadedState | `object` | `{}` | regular redux preloadedState |
| enhancer | `function` | `null` | regular redux enhancer |


### defineCollection(...mixins)
usage same as [composeClass(...mixins)](#composeclassmixins) but default last mixin is SubmittingCollection



## Connect with React

### connect(mapPropsFunc, mapActionsFunc)
alias: `connectDatavan()`
both first argument of `mapPropsFunc`, `mapActionsFunc` is datavan store (dv in below)
```js
connect(
  dv => {
    return { name: dv.memory.get('name') }
  },
  dv => {
    return {
      setName(name) {
        dv.memory.set('name', name)
      }
    }
  },
)
```

### Provider Component
same as redux's Provider
```js
<Provider store={store}>...</Provider>
```

### createDatavanEnhancer(definitions)
create redux enhancer, refer to [defineStore(definitions)](#definestoredefinitions)


## Classes for directly use
Can use following classes as definitions
```js
defineStore({
  browser: Browser,
  local: LocalStorage,
  session: SessionStorage,
  cookie: Cookie,
  koaCookie: KoaCookie,
})
```

### Browser Class
get and listen to browser resize. You can also import `getBrowserWidth()` and `getBrowserHeight()` to any collection.

### LocalStorage Class
read, write localStorage

### SessionStorage Class
read, write sessionStorage

### Cookie Class
read, write browser cookie

### KoaCookie Class
read, write cookie in koa

### Searchable Class
add simple full-text search to collection
```js
defineCollection({
  searchFields: ['firstName', 'lastName', ...],
}, Searchable)
```
You can also use the search function by import [search(docs, keywordStr, getSearchFields)](#searchdocs-keywordstr-getsearchfields)



## Classes for extend

### KeyValueStore Class
### Collection Class
### FetchingCollection Class
### SubmittingCollection Class



## Util functions

### getSetters(...names)
generate getters and setters for names

### composeClass(...mixins)
mixin can be one of
- simple object with functions
- function(SuperClass) { return NewSubClass } "with a superclass as input and a subclass extending that superclass as output"
- es6 Class

### search(docs, keywordStr, getSearchFields)
