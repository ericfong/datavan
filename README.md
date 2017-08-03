![https://img.shields.io/npm/v/datavan.svg](https://img.shields.io/npm/v/datavan.svg?style=flat-square) [![state](https://img.shields.io/badge/state-alpha-green.svg?style=flat-square)]() [![npm](https://img.shields.io/npm/dt/datavan.svg?maxAge=2592000&style=flat-square)]() [![npm](https://img.shields.io/npm/l/datavan.svg?style=flat-square)]()

> define mongo-like collections, and customize fetching and submiting logic to remote

__Features__
- based on [redux](https://www.npmjs.com/package/redux) & [react-redux](https://www.npmjs.com/package/react-redux) (wrap redux state into in-memory mongodb)
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
    - [defineCollection(name, mixin, dependencies)](#definecollectionname-mixin-dependencies)
    - [datavanEnhancer](#datavanenhancer)
    - [Use of collection definition](#use-of-collection-definition)
    - [composeMixins(...mixins)](#composemixinsmixins)
- [Collection Interface](#collection-interface)
  - [Methods](#methods)
    - [find(query, option)](#findquery-option)
    - [findOne(query, option)](#findonequery-option)
    - [insert(doc | docs)](#insertdoc--docs)
    - [update(query, update)](#updatequery-update)
    - [remove(query)](#removequery)
    - [get(id)](#getid)
    - [setData(change)](#setdatachange)
    - [set(id, doc) | set(doc)](#setid-doc--setdoc)
    - [del(id)](#delid)
  - [Mixin props](#mixin-props)
    - [idField](#idfield)
    - [cast(doc)](#castdoc)
    - [getData()](#getdata)
    - [getDataById(id, option)](#getdatabyidid-option)
    - [setData(change, option)](#setdatachange-option)
    - [genId()](#genid)
    - [getFetchQuery()](#getfetchquery)
    - [getFetchKey(fetchQuery, option)](#getfetchkeyfetchquery-option)
- [Built-in mixins](#built-in-mixins)
    - [Browser Mixin](#browser-mixin)
    - [createStorage(localStorage | sessionStorage)](#createstoragelocalstorage--sessionstorage)
    - [Cookie Mixin](#cookie-mixin)
    - [KoaCookie Mixin](#koacookie-mixin)
    - [Searchable Mixin](#searchable-mixin)
  - [Util functions](#util-functions)
    - [search(docs, keywordStr, getSearchFields)](#searchdocs-keywordstr-getsearchfields)
    - [getSetters(...names)](#getsettersnames)
- [Server Rendering](#server-rendering)

<!-- TOC END -->





# Getting Started
```js
import { createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { datavanEnhancer, defineCollection } from 'datavan'

const PureComponent = ({ user }) => <div>{(user && user.name) || 'No Name'}</div>

// defined collection called 'users'
const Users = defineCollection('users', {
  onFetch(collection, query, option) {
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
const store = datavanEnhancer(createStore)()

render(<Provider store={store}><MyApp /></Provider>)
```




# Define Collections and Enhancer for redux

### defineCollection(name, mixin, dependencies)
define collection

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| name | `string` | `required` | collection name |
| mixin | `object` / `function`| `null` | default props or mixin function to inject new functions |
| dependencies | `Array of [collection-definition]` | `null` | other collection definitions |

- name
- mixin as `object`: will become defaults props
- mixin as `function`: can provide defaults or assign overrides
- dependencies: depended collections will be created before this collection created.
```js
mixin = (props, next) => {
  const defaultedCollection = { ...props, ...newDefaults }
  const collection = next(defaultedCollection)
  const newCollection = { ...collection, ...newOverrides }
  return newCollection
}
const Users = defineCollection('users', mixin)

// Blogs depend on Users, create Blogs collection will alsog create Blogs collection
const Blogs = defineCollection('blogs', null, [Users])
```


### datavanEnhancer
datavan enhancer for redux
```js
// createStore
const store = createStore(reducer, preloadedState, datavanEnhancer)
// or
const store = datavanEnhancer(createStore)(reducer, preloadedState)

// first use of collection definition will create that collection
Users(store).find()
```


### Use of collection definition
Can use collection definition function to access or create collection instance. By passing redux state or dispatch or store or collection into the function and get back collection instance.

```js
Users(state | dispatch | store | collection).find()
```


### composeMixins(...mixins)

composeMixins mixins into mixin. mixin = `(obj, nextMixin) => newObj`





# Collection Interface

## Methods

### find(query, option)
Return: Array of documents
- query: Array<id> | query-object (mongodb like query object, we use [mingo](https://www.npmjs.com/package/mingo) to filter documents)

### findOne(query, option)
Return: single document

### insert(doc | docs)
Return: inserted docs

### update(query, update)
- update operations based on [immutability-helper](https://www.npmjs.com/package/immutability-helper)

### remove(query)

### get(id)

### setData(change)

### set(id, doc) | set(doc)

### del(id)

## Mixin props
props that can pass-in to override the default functionality

### idField

### cast(doc)

### getData()

### getDataById(id, option)

### setData(change, option)

### genId()

### getFetchQuery()

### getFetchKey(fetchQuery, option)





# Built-in mixins
You can use ```import { XX } from 'datavan'``` to import and use the following mixins

### Browser Mixin
get and listen to browser resize, will mixin `getWidth()` and `getHeight()` functions

### createStorage(localStorage | sessionStorage)
read, write localStorage or sessionStorage

### Cookie Mixin
read, write browser cookie

### KoaCookie Mixin
read, write cookie in koa

### Searchable Mixin
add simple full-text search to collection
```js
Searchable({ fields: ['firstName', 'lastName', ...] })
```





## Util functions

### search(docs, keywordStr, getSearchFields)
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| docs | `[doc]` | __required__ | the source of searching docs |
| keywordStr | `string` | __required__ | search keyword string |
| getSearchFields | `function` | __required__ | `function(doc) { return ['name', 'search-field', ...] }` function that return array of field names for searching per doc |

### getSetters(...names)
generate getters and setters for names





# Server Rendering
```js
import { createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { datavanEnhancer, serverPreload } from '.'

// define collection
const Users = defineCollection('users', {
  onFetch(collection, query, option) { /* server side implementation */ },
})

// connect react component
const MyApp = connect((state, { username }) => {
  return {
    user: Users(state).findOne({ username }, { serverPreload: true }),
  }
})(PureComponent)

// create store
const serverStore = datavanEnhancer(createStore)()

// renderToString
const html = await serverRender(serverStore, () =>
  ReactDOMServer.renderToString(<Provider store={serverStore}><MyApp /></Provider>)
)

// transfer data to browser
const json = JSON.stringify(store.getState())

// -------

// browser side
const preloadedState = JSON.parse(json)
const browserStore = datavanEnhancer(createStore)(null, preloadedState)



ReactDOM.render(<Provider store={browserStore}><MyApp /></Provider>, dom)
```
