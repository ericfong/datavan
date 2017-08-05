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
<!-- TOC depthFrom:1 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Getting Started](#getting-started)
- [Define Collections and Enhancer for redux](#define-collections-and-enhancer-for-redux)
		- [defineCollection(name, override, dependencies)](#definecollectionname-override-dependencies)
		- [datavanEnhancer](#datavanenhancer)
		- [Use of collection_definition](#use-of-collectiondefinition)
- [Collection Interface](#collection-interface)
	- [Methods](#methods)
		- [find(query, option)](#findquery-option)
		- [findOne(query, option)](#findonequery-option)
		- [get(id)](#getid)
		- [set(id, doc) | set(doc)](#setid-doc-setdoc)
		- [del(id)](#delid)
		- [insert(doc | docs)](#insertdoc-docs)
		- [update(query, update)](#updatequery-update)
		- [remove(query)](#removequery)
	- [Overridable](#overridable)
		- [idField](#idfield)
		- [onFetch(fetchQuery, option, collection)](#onfetchfetchquery-option-collection)
		- [onSubmit(submits, collection)](#onsubmitsubmits-collection)
		- [getFetchQuery(query, option)](#getfetchqueryquery-option)
		- [getFetchKey(fetchQuery, option)](#getfetchkeyfetchquery-option)
		- [cast(doc)](#castdoc)
		- [genId()](#genid)
		- [onGetAll()](#ongetall)
		- [onGet(id, option)](#ongetid-option)
		- [onSetAll(newDocs, option)](#onsetallnewdocs-option)
- [Built-in mixins](#built-in-mixins)
		- [Browser Mixin](#browser-mixin)
		- [createStorage(localStorage | sessionStorage)](#createstoragelocalstorage-sessionstorage)
		- [Cookie Mixin](#cookie-mixin)
		- [KoaCookie Mixin](#koacookie-mixin)
		- [Searchable Mixin](#searchable-mixin)
	- [Util functions](#util-functions)
		- [search(docs, keywordStr, getSearchFields)](#searchdocs-keywordstr-getsearchfields)
- [Server Rendering](#server-rendering)

<!-- /TOC -->




# Getting Started
```js
import { createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { defineCollection, datavanEnhancer } from 'datavan'

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

### defineCollection(name, override, dependencies)
define collection

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| name | `string` | `required` | the name of collection instance |
| override | `object` / `function`| `undefined` | override props or functions into collection instance |
| dependencies | `Array of [collection_definition]` | `undefined` | other collection definitions |

Return: collection_definition

- if override is `object`, all props will be assigned to collection instance
- if override is `function`, collection instance will be passed as the first argument. You can use that to inject anything to collection
- dependencies: depended collections will be created before this collection created.

```js
const Users = defineCollection('users', { idField: 'id' })
// OR
const Users = defineCollection('users', (collection) => {
  Object.assign(collection, { idField: 'id', ...otherOverride })
})

// Blogs depend on Users, create Blogs collection will also create Users collection
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


### Use of collection_definition
collection_definition is a `function` which help to access and ensure the lazy collection have been created.

By passing redux `state | dispatch | store | collection` into the function and get back collection instance.

```js
Users(state | dispatch | store | collection).find()
```





# Collection Interface

## Methods

### find(query, option)
Return: Array of documents
- query: Array<id> | query-object (mongodb like query object, we use [mingo](https://www.npmjs.com/package/mingo) to filter documents)

### findOne(query, option)
Return: single document

### get(id)

### set(id, doc) | set(doc)

### del(id)

### insert(doc | docs)
Return: inserted docs

### update(query, update)
- update operations based on [immutability-helper](https://www.npmjs.com/package/immutability-helper)

### remove(query)



## Overridable
props that can pass-in to override the default functionality

### idField
id field for document (default: `_id`)

### onFetch(fetchQuery, option, collection)
async fetch function (default: `undefined`). Should return array or map of documents

### onSubmit(submits, collection)
async submit function (default: `undefined`). Should return array or map of documents. Return `false` means submit cancelled.

### getFetchQuery(query, option)
calculate and return fetchQuery (for onFetch) from mongo query

### getFetchKey(fetchQuery, option)
calculate and return fetchKey (to determine cache hit or miss) from fetchQuery

### cast(doc)
cast and convert doc fields. Return: casted doc

### genId()
generate a new tmp id

### onGetAll()
sync get all documents function. Return: map of documents (keyed by idField)

### onGet(id, option)
sync get one document function. Return: document

### onSetAll(newDocs, option)
sync set many documents






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





# Server Rendering
```js
import { createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { defineCollection, datavanEnhancer, setOverrides, serverPreload } from '.'

// define collection
const Users = defineCollection('users', {
  onFetch(query, option) { /* browser side implementation */ },
})

// connect react component
const MyApp = connect((state, { username }) => {
  return {
    user: Users(state).findOne({ username }, { serverPreload: true }),
  }
})(PureComponent)

// create store
const serverStore = datavanEnhancer(createStore)()

setOverrides(serverStore, {
  users: {
    onFetch(query, option) { /* server side override */ },
  },
})

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
