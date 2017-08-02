![https://img.shields.io/npm/v/datavan.svg](https://img.shields.io/npm/v/datavan.svg?style=flat-square) [![state](https://img.shields.io/badge/state-alpha-green.svg?style=flat-square)]() [![npm](https://img.shields.io/npm/dt/datavan.svg?maxAge=2592000&style=flat-square)]() [![npm](https://img.shields.io/npm/l/datavan.svg?style=flat-square)]()

> define mongo-like collections, and customize fetching and submiting logic to remote

__Features__
- based on redux & react-redux (wrap redux state into in-memory mongodb)
- can access regular http/async/promise api
- results are auto cached and auto gc
- already have reselect like memoize layer, don't need to think about createSelector
- also work for sync datasource (ex: localStorage)
- can be offline (conflict solve on your own)
- with searchable plugin
- lightweight core and persistent on your own

__How It works?__

During collection.find() / .get(), datavan will check and call your onFetch function as a side effect unless cache is fresh. Fetched data will be cached into redux store.

Welcome to extend or hack datavan or other classes to change behaviours


__Table of Contents__
<!-- TOC START min:1 max:3 link:true update:true -->
- [Getting Started](#getting-started)
- [Define Collections and Enhancer for redux](#define-collections-and-enhancer-for-redux)
    - [defCollection(name, wrapper, dependencies)](#defcollectionname-wrapper-dependencies)
    - [createEnhancer()](#createenhancer)
    - [Use of collection definition](#use-of-collection-definition)
    - [Use with other redux middlewares/enhancer](#use-with-other-redux-middlewaresenhancer)
- [Collection Interface](#collection-interface)
  - [Methods](#methods)
    - [find(query, option)](#findquery-option)
    - [findOne(query, option)](#findonequery-option)
    - [insert(doc | docs)](#insertdoc--docs)
    - [update(query, update)](#updatequery-update)
    - [remove(query)](#removequery)
    - [get(id)](#getid)
    - [setAll(change)](#setallchange)
    - [set(id, doc) | set(doc)](#setid-doc--setdoc)
    - [del(id)](#delid)
  - [props](#props)
    - [idField](#idfield)
    - [cast(doc)](#castdoc)
- [Connect with React](#connect-with-react)
    - [connect(mapPropsFunc, mapActionsFunc)](#connectmappropsfunc-mapactionsfunc)
    - [Provider Component](#provider-component)
- [Other exports](#other-exports)
  - [Classes for directly use in collection definitions](#classes-for-directly-use-in-collection-definitions)
    - [Browser Class](#browser-class)
    - [LocalStorage Class](#localstorage-class)
    - [SessionStorage Class](#sessionstorage-class)
    - [Cookie Class](#cookie-class)
    - [KoaCookie Class](#koacookie-class)
    - [Searchable Mixin](#searchable-mixin)
  - [Util functions](#util-functions)
    - [getSetters(...names)](#getsettersnames)
    - [search(docs, keywordStr, getSearchFields)](#searchdocs-keywordstr-getsearchfields)
- [Server Rendering](#server-rendering)

<!-- TOC END -->





# Getting Started
```js
import { createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { createEnhancer, defCollection } from 'datavan'

const PureComponent = ({ user }) => <div>{(user && user.name) || 'No Name'}</div>

// defined collection called 'users'
const Users = defCollection('users', {
  onFetch(query, option) {
    return Promise.resolve([{ _id: 'id', name: 'loaded name' }])
  },
})

// connect
const MyApp = connect((state, { username }) => {
  return {
    user: Users(state).findOne({ username }),
    // first call result will be undefined
    // after HTTP response and cached, connect will be re-run
    // so, second result will get user object
  }
})(PureComponent)

// createStore
const store = createEnhancer()(createStore)()

render(<Provider store={store}><MyApp /></Provider>)
```




# Define Collections and Enhancer for redux

### defCollection(name, wrapper, dependencies)
define collection

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| name | `string` | `required` | collection name |
| wrapper | `function` / `object` | `null` | default values or wrapper function to inject new functions |
| dependencies | `[collection-definition]` | `null` | other collection definitions |

- name
- wrapper as `object`: will become defaults values or functions for collection
- wrapper as `function`: can provide defaults or assign overrides
```js
wrapper = (props, next) => {
  const defaultedCollection = { ...props, ...newDefaults }
  const collection = next(defaultedCollection)
  const newCollection = { ...collection, ...newOverrides }
  return newCollection
}
const Users = defCollection('users', wrapper)
```
- dependencies: depended collections will be created before this collection created.


### createEnhancer()
create redux enhancer
```js
const enhancer = createEnhancer()
// createStore
const store = createStore(reducer, preloadedState, enhancer)
// or
const store = enhancer(createStore)(reducer, preloadedState)

// first use of collection definition will create that collection
Users(store).find()
```


### Use of collection definition
Can use collection definition function to access or create collection instance. By passing redux state or dispatch or store or collection into the function and get back collection instance.

```js
Users(state | dispatch | store | collection)
```


### combineWrappers(...wrapper)

combineWrappers wrappers into wrapper. wrapper = `(obj, nextWrapper) => newObj`





# Collection Interface

## Methods

### find(query, option)
Return: Array of document
- query: Array<id> | Object (mongodb like query object, we use [sift](https://www.npmjs.com/package/sift) to filter documents)

### findOne(query, option)
Return: single document

### insert(doc | docs)

### update(query, update)

### remove(query)

### get(id)

### setAll(change)

### set(id, doc) | set(doc)

### del(id)

## props
props that can pass-in to override the default functionality

### idField

### cast(doc)



# Connect with React

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





# Other exports
datavan exported the following functions or classes. You can use ```import { XX } from 'datavan'``` to import.

## Classes for directly use in collection definitions
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

### Searchable Mixin
add simple full-text search to collection
```js
defineStore({
  users: [{ searchFields: ['firstName', 'lastName', ...] }, Searchable],
})
```
- Mixin is function with a superclass as input and a subclass extending that superclass as output
- You can also use the search function by import [search(docs, keywordStr, getSearchFields)](#searchdocs-keywordstr-getsearchfields)



## Util functions

### getSetters(...names)
generate getters and setters for names

### search(docs, keywordStr, getSearchFields)
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| docs | `[doc]` | __required__ | the source of searching docs |
| keywordStr | `string` | __required__ | search keyword string |
| getSearchFields | `function` | __required__ | `function(doc) { return ['name', 'search-field', ...] }` function that return array of field names for searching per doc |





# Server Rendering
```js
import { serverPreload, serverRender } from '.'

const MyApp = connect((dv, { username }) => {
  // following .find() .get() will be server preloaded (within this connect function)
  serverPreload(dv, true)
  return {
    user: dv.users.findOne({ username }),
  }
})(PureComponent)


// Provider and Store
const createServerStore = defineStore({
  users: {
    onFetch(query, option) { /* server side implementation */ },
  },
})
const serverStore = createServerStore()

// renderToString
const html = await serverRender(serverStore, () =>
  ReactDOMServer.renderToString(<Provider store={serverStore}><MyApp /></Provider>)
)
// transfer data to browser
const json = JSON.stringify(store.getState())

// -------

// browser side
const createBrowserStore = defineStore({
  users: {
    onFetch(query, option) { /* browser side implementation */ },
  },
})
const preloadedState = JSON.parse(json)
const browserStore = createBrowserStore(null, preloadedState)

ReactDOM.render(<Provider store={browserStore}><MyApp /></Provider>, dom)
```
