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


__Table of Contents__
<!-- TOC depthFrom:1 depthTo:6 withLinks:1 updateOnSave:1 orderedList:0 -->

- [Getting Started](#getting-started)
- [Define Collections and Enhancer for redux](#define-collections-and-enhancer-for-redux)
		- [defineCollection(name, override, dependencies)](#definecollectionname-override-dependencies)
		- [datavanEnhancer](#datavanenhancer)
		- [Use of collection_definition](#use-of-collectiondefinition)
- [setOverrides(store, overrides)](#setoverridesstore-overrides)
- [datavanReducer()](#datavanreducer)
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
		- [getSubmits()](#getsubmits)
		- [invalidate(ids)](#invalidateids)
		- [reset(ids, option)](#resetids-option)
		- [getAll()](#getall)
		- [setAll(valuesTable)](#setallvaluestable)
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
		- [onMutate(nextById, prevById, mutation)](#onmutatenextbyid-prevbyid-mutation)
- [Built-in plugins](#built-in-plugins)
		- [plugBrowser](#plugbrowser)
		- [plugLocalStorage(localStorage | sessionStorage)](#pluglocalstoragelocalstorage-sessionstorage)
		- [plugCookie(cookieConf)](#plugcookiecookieconf)
		- [plugKoaCookie(cookieConf, koaCtx)](#plugkoacookiecookieconf-koactx)
		- [plugSearchable({ fields: [] })](#plugsearchable-fields-)
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
const MyApp = connect(
	(state, { username }) => {
	  return {
	    user: Users(state).findOne({ username }),
	    // first call result will be undefined
	    // after HTTP response and cached, connect will be re-run
	    // so, second result will get user object
	  }
	},
	(dispatch) => {
	  return {
			// query by [mingo](https://www.npmjs.com/package/mingo)
	    // update by [immutability-helper](https://www.npmjs.com/package/immutability-helper)
			modifyUser: () => Users(dispatch).update({ username }, { $merge: { name: 'John' } }),
	  }
	},
)(PureComponent)

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
  return { idField: 'id', ...otherOverride }
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
// if you use combineReducers, you need to
import { datavanEnhancer, datavanReducer } from 'datavan'
const store = createStore(combineReducers({ ..., datavan: datavanReducer }), preloadedState, datavanEnhancer)

// first use of collection definition will create that collection
Users(store).find()
```


### Use of collection_definition
collection_definition is a `function` which help to access and ensure the lazy collection have been created.

By passing redux `state | dispatch | store | collection` into the function and get back collection instance.

```js
Users(state | dispatch | store | collection).find()
```

# setOverrides(store, overrides)
set store-level overrides which will be run after collection-definition-level overrides
```js
setOverrides(store, { cookie: plugCookie(cookieConf) })
```

# datavanReducer()
redux reducer that used with `combineReducers`
```js
const store = createStore(combineReducers({ ..., datavan: datavanReducer }), preloadedState, datavanEnhancer)
```





# Collection Interface

## Methods

### find(query, option)
Return: Array of documents
- query: Array<id> | query-object (mongodb like query object, we use [mingo](https://www.npmjs.com/package/mingo) to filter documents)
- option support 'sort','limit','skip'. Like mongo/monk api
- option support 'keyBy','groupBy','map'. Use lodash to implement
```js
arr = Users(state).find({ name: 'john' }, {
	sort: { createdAt: -1 },
	limit: 10, skip: 20,
	// one of keyBy, groupBy, map
	keyBy: 'username',
	groupBy: 'shortId',
	map: 'name', // like pluck
})
```

### findOne(query, option)
Return: single document
```js
doc = Users(state).findOne(query)
```

### get(id)
```js
doc = Users(state).get('id-123')
```

### set(id, doc) | set(doc)
```js
Users(state).set('id-123', { _id: 'id-123', name: 'Mary' })
Users(state).set({ _id: 'id-123', name: 'Mary' })
```

### del(id)
```js
Users(state).del('id-123')
```

### insert(doc | docs)
Return: inserted docs
```js
insertedDoc = Users(state).insert({ name: 'Mary' })
insertedDocs = Users(state).insert([{ name: 'Mary' }, { name: 'John' }])
```

### update(query, update)
- update operations based on [immutability-helper](https://www.npmjs.com/package/immutability-helper)
```js
Users(state).update({ name: 'Mary' }, { $merge: { name: 'Mary C' } })
```

### remove(query)
remove all docs that match the query
```js
Users(state).remove({ name: 'May' })
```

### getSubmits()
get local changed documents
```js
const dirtyDocs = Users(state).getSubmits()
```

### invalidate(ids)
invalidate cache and re-fetch in future get/find
```js
Users(state).invalidate(['id-123', 'query-fetchKey'])
// OR invalidate all
Users(state).invalidate()
```

### reset(ids, option)
reset local change and re-fetch in future get/find
```js
Users(state).reset(['id-123'])
// OR invalidate all
Users(state).reset()
```

### getAll()
get all documents. This won't trigger onFetch()
```js
const docsTable = Users(state).getAll()
```

### setAll(valuesTable)
set a table of documents into collection
```js
Users(state).setAll({ key: doc, key2: doc2 })
```



## Overridable
props that can pass-in to override the default functionality

### idField
id field for document (default: `_id`)
```js
defineCollection('users', { idField: 'id' })
```

### onFetch(fetchQuery, option, collection)
async fetch function (default: `undefined`). Should return array or map of documents
```js
defineCollection('users', {
	onFetch(query, option) {
		return fetch('restful-api?name=john')
	},
})
```

### onSubmit(submits, collection)
async submit function (default: `undefined`). Should return array or map of documents. Return `false` means submit cancelled.
```js
defineCollection('users', {
	onSubmit(submits) {
		return fetch('restful-api', { method: 'POST', body: JSON.stringify(submits) })
	},
})
```

### getFetchQuery(query, option)
calculate and return fetchQuery (for onFetch) from mongo query
```js
defineCollection('users', {
	getFetchQuery(query) {
		return { ...query, ...add_somethings, ...remove_somethings }
	},
})
```

### getFetchKey(fetchQuery, option)
calculate and return fetchKey (to determine cache hit or miss) from fetchQuery
```js
defineCollection('users', {
	getFetchKey(fetchQuery) {
		return 'formatted string from fetchQuery'
	},
})
```

### cast(doc)
cast and convert doc fields. Return: casted doc
```js
defineCollection('users', {
	cast(doc) {
		doc.createdAt = new Date(doc.createdAt)
		return doc
	},
})
```

### genId()
generate a new tmp id string

### onGetAll()
sync get all documents function. Return: map of documents (keyed by idField)
```js
defineCollection('users', {
	onGetAll() {
		return { ...table_of_docs }
	},
})
```

### onGet(id, option)
sync get one document function. Return: document
```js
defineCollection('users', {
	onGet: id => storage.getItem(id),
})
```

### onSetAll(newDocs, option)
sync set many documents
```js
defineCollection('localStorage', ({ onSetAll: originalOnSetAll }) => ({
	onSetAll(change, option) {
		originalOnSetAll.call(this, change, option)
		_.each(change, (value, key) => {
			if (key === '$unset') {
				_.each(value, k => storage.removeItem(k))
				return
			}
			storage.setItem(key, value)
		})
	},
}))
```

### onMutate(nextById, prevById, mutation)
called when collection mutation. `nextById`, `prevById` is next and previous values by id table. `mutation` is the mutation object.
```js
defineCollection('localStorage', {
	onMutate(nextById, prevById) {
    if (nextById.doc1 !== prevById.doc1) {
			// do something
    }
  },
})
```





# Built-in plugins

### plugBrowser
get and listen to browser resize, will mixin `getWidth()` and `getHeight()` functions
```js
setOverrides(store, { browser: plugBrowser })  // plugBrowser is a object
```

### plugLocalStorage(localStorage | sessionStorage)
read, write localStorage or sessionStorage
```js
setOverrides(store, { sessionStorage: plugLocalStorage(sessionStorage) })
```

### plugCookie(cookieConf)
read, write browser cookie
```js
setOverrides(store, { cookie: plugCookie(cookieConf) })
// cookieConf ref to [js-cookie](https://www.npmjs.com/package/js-cookie)
```

### plugKoaCookie(cookieConf, koaCtx)
read, write cookie in koa
```js
setOverrides(store, { cookie: plugKoaCookie(cookieConf, koaCtx) })
// cookieConf ref to [cookies](https://www.npmjs.com/package/cookies)
// koaCtx is koa ctx object
```

### plugSearchable({ fields: [] })
add simple full-text search to collection
```js
setOverrides(store, { users: plugSearchable({ fields: ['firstName', 'lastName', ...] }) })
// OR
defineCollection('blogs', [
	plugSearchable(...),
	{ idField: 'id', ...others },
])
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
const html = await serverPreload(serverStore, () =>
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
