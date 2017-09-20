![https://img.shields.io/npm/v/datavan.svg](https://img.shields.io/npm/v/datavan.svg?style=flat-square) [![state](https://img.shields.io/badge/state-alpha-green.svg?style=flat-square)]() [![npm](https://img.shields.io/npm/dt/datavan.svg?maxAge=2592000&style=flat-square)]() [![npm](https://img.shields.io/npm/l/datavan.svg?style=flat-square)]()

> wrap redux state into mongodb-like collections, customizable fetching and submitting logic

__Features__
- based on [redux](https://www.npmjs.com/package/redux)
- can access regular http/async/promise api
- results are auto cached
- already have reselect like memoize layer, don't need to think about createSelector
- also work for sync datasource (ex: localStorage)
- support offline or server-side-render (resolve conflict on your own)
- with searchable plugin
- persistent on your own
- code in es6, support tree-shaking

__How It works?__

During collection.find() / .get(), datavan will check you cache. If cache is missing, it will call your onFetch function as a side effect and update the cache.


__Table of Contents__
<!-- TOC START min:1 max:3 link:true update:true -->
- [Getting Started](#getting-started)
- [Define Collections and Enhancer for redux](#define-collections-and-enhancer-for-redux)
    - [defineCollection(name, spec)](#definecollectionname-spec)
    - [datavanEnhancer({ overrides, ...context })](#datavanenhancer-overrides-context-)
- [Collection Methods](#collection-methods)
    - [find(collection, query, option)](#findcollection-query-option)
    - [findAsync(collection, query, option)](#findasynccollection-query-option)
    - [findOne(collection, query, option)](#findonecollection-query-option)
    - [get(collection, id)](#getcollection-id)
    - [getAsync(collection, query, option)](#getasynccollection-query-option)
    - [setAll(collection, valuesTable)](#setallcollection-valuestable)
    - [getSubmits(collection)](#getsubmitscollection)
    - [getOriginals(collection)](#getoriginalscollection)
    - [set(collection, id, doc) | set(collection, doc)](#setcollection-id-doc--setcollection-doc)
    - [del(collection, id)](#delcollection-id)
    - [insert(collection, doc | docs)](#insertcollection-doc--docs)
    - [update(collection, query, update)](#updatecollection-query-update)
    - [remove(collection, query)](#removecollection-query)
    - [invalidate(collection, ids)](#invalidatecollection-ids)
    - [reset(collection, ids, option)](#resetcollection-ids-option)
    - [getAll(collection)](#getallcollection)
    - [submit(collection, onSubmitFunc)](#submitcollection-onsubmitfunc)
    - [load(table, data, option)](#loadtable-data-option)
- [Collection Spec](#collection-spec)
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
    - [dependencies: Array of other collection selectors](#dependencies-array-of-other-collection-selectors)
    - [initState](#initstate)

<!-- TOC END -->

__Other Docs__
- [Server Rendering](https://github.com/ericfong/datavan/blob/master/doc/Server_Rendering.md)
- [Store functions](https://github.com/ericfong/datavan/blob/master/doc/Store_Functions.md)
- [Plugins](https://github.com/ericfong/datavan/blob/master/doc/Plugins.md)
- [Util functions](https://github.com/ericfong/datavan/tree/master/doc/util)





# Getting Started
```js
import { createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { defineCollection, datavanEnhancer } from 'datavan'

// defined collection called 'users'
const Users = defineCollection('users', {
  onFetch(collection, query, option) {
    return Promise.resolve([{ _id: 'id', name: 'john' }])
  },
})

const PureComponent = ({ user }) => <div>{(user && user.name) || 'No Name'}</div>

// connect
const MyApp = connect(
	(state, { name }) => {
	  return {
	    user: Users(state).findOne({ name }),
	    // first call result will be undefined
	    // after HTTP response and cached, connect will be re-run
	    // so, second result will get user object
	  }
	},
	(dispatch, { name }) => {
	  return {
			// query by [mingo](https://www.npmjs.com/package/mingo)
	    // update by [immutability-helper](https://www.npmjs.com/package/immutability-helper)
			modifyUser: () => Users(dispatch).update({ name }, { $merge: { name: 'smith' } }),
	  }
	},
)(PureComponent)

// createStore
const store = createStore(null, null, datavanEnhancer())

render(<Provider store={store}><MyApp name="john" /></Provider>)
```




# Define Collections and Enhancer for redux

### defineCollection(name, spec)
define a collection and return a collection selector. You can use collection selector as `Users(state)` or `Users(dispatch)` or `Users(store)`. Selector will get or lazy create collection core.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| name | `string` | `required` | the name of collection instance |
| spec | `object` | `undefined` | [collection spec](#collection-spec) for you to customize collections |

```js
const Users = defineCollection('users', { idField: 'id', ...spec })
find(Users(state | dispatch | store), query)
```


### datavanEnhancer({ overrides, ...context })
create datavan enhancer for redux
```js
import { datavanEnhancer, datavanReducer } from 'datavan'

// createStore
const store = createStore(reducer, preloadedState, datavanEnhancer())

// if you use combineReducers, you also need to use `datavanReducer`
const store = createStore(combineReducers({ ..., datavan: datavanReducer }), preloadedState, datavanEnhancer())

find(Users(store), query)
```

set overrides to override collection specs
```js
// with object override
createStore(reducer, preloadedState, datavanEnhancer({
  overrides: {
    users: { idField: 'id' },
  },
}))

// with function override
createStore(reducer, preloadedState, datavanEnhancer({
  overrides: {
    cookie: (spec) => newSpec,
  },
}))

// use plugin as override
createStore(reducer, preloadedState, datavanEnhancer({
  overrides: {
    cookie: plugCookie(cookieConf),
  },
}))
```





# Collection Methods

### find(collection, query, option)
Return: Array of documents
- query: Array<id> | query-object (mongodb like query object, we use [mingo](https://www.npmjs.com/package/mingo) to filter documents)
- option support 'sort','limit','skip'. Like mongo/monk api
- option support 'keyBy','groupBy','map'. Use lodash to implement
```js
arr = find(Users(state), { name: 'john' }, {
	sort: { createdAt: -1 },
	limit: 10, skip: 20,
	// one of keyBy, groupBy, map
	keyBy: 'username',
	groupBy: 'shortId',
	map: 'name', // like pluck
})
```

### findAsync(collection, query, option)


### findOne(collection, query, option)
Return: single document
```js
doc = findOne(Users(state), query)
```

### get(collection, id)
```js
doc = get(Users(state), 'id-123')
```

### getAsync(collection, query, option)


### setAll(collection, valuesTable)
set a table of documents into collection
```js
setAll(Users(state), { key: doc, key2: doc2 })
```

### getSubmits(collection)
get local changed documents
```js
const dirtyDocs = getSubmits(Users(state))
```

### getOriginals(collection)
get local changed documents' originals
```js
const originalDocs = getOriginals(Users(state))
```

### set(collection, id, doc) | set(collection, doc)
```js
set(Users(state), 'id-123', { _id: 'id-123', name: 'Mary' })
set(Users(state), { _id: 'id-123', name: 'Mary' })
```

### del(collection, id)
```js
del(Users(state), 'id-123')
```

### insert(collection, doc | docs)
Return: inserted docs
```js
insertedDoc = insert(Users(state), { name: 'Mary' })
insertedDocs = insert(Users(state), [{ name: 'Mary' }, { name: 'John' }])
```

### update(collection, query, update)
- update operations based on [immutability-helper](https://www.npmjs.com/package/immutability-helper)
```js
update(Users(state), { name: 'Mary' }, { $merge: { name: 'Mary C' } })
```

### remove(collection, query)
remove all docs that match the query
```js
remove(Users(state), { name: 'May' })
```

### invalidate(collection, ids)
invalidate cache and re-fetch in future get/find
```js
invalidate(Users(state), ['id-123', 'query-fetchKey'])
// OR invalidate all
invalidate(Users(state))
```

### reset(collection, ids, option)
reset local change and re-fetch in future get/find
```js
reset(Users(state), ['id-123'])
// OR invalidate all
reset(Users(state))
```

### getAll(collection)
get all documents. This won't trigger onFetch()
```js
const docsTable = getAll(Users(state))
```

### submit(collection, onSubmitFunc)
submit collection with onSubmitFunc. If onSubmitFunc is missing, defined onSubmit will be used
```js
await submit(Users(state))
```

### load(table, data, option)
load bulk data into store. data can be
- Array of docs
- Or a object with `{ byId: {}, originals: {}, requests: {} }`
- Or Table of docs
```js
// Array of docs
load(users, [
  { _id: 'user-1', name: 'John' }
])

// Or a object with at least one of `{ byId: {}, originals: {}, requests: {} }`
load(users, {
  // byId is table of docs
  byId: {
    'user-1': { _id: 'user-1', name: 'John' },
  },
  // originals is table of modified docs' originals
  originals: {
    'user-1': { _id: 'user-1', name: 'Old Name' },
  },
  // requests is request cache
  requests: {},
})

// Or Table of docs (byId)
load(users, {
  'user-1': { _id: 'user-1', name: 'John' },
})
```





# Collection Spec
spec fields that can be used in customization

### idField
id field for document (default: `_id`)

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
getFetchQuery(query) {
	return { ...query, ...add_somethings, ...remove_somethings }
}
```

### getFetchKey(fetchQuery, option)
calculate and return fetchKey (to determine cache hit or miss) from fetchQuery
```js
getFetchKey(fetchQuery) {
	return 'formatted string from fetchQuery'
}
```

### cast(doc)
cast and convert doc fields. Return: casted doc
```js
cast(doc) {
	doc.createdAt = new Date(doc.createdAt)
	return doc
}
```

### genId()
generate a new tmp id string

### onGetAll()
sync get all documents function. Return: map of documents (keyed by idField)
```js
onGetAll() {
	return { ...table_of_docs }
}
```

### onGet(id, option)
sync get one document function. Return: document
```js
onGet: id => storage.getItem(id)
```

### onSetAll(newDocs, option)
called only when collection setAll or other updates.
```js
onSetAll(change, option) {
	_.each(change, (value, key) => {
		if (key === '$unset') {
			_.each(value, k => storage.removeItem(k))
			return
		}
		storage.setItem(key, value)
	})
}
```

### onMutate(nextById, prevById, mutation)
called only when collection mutation. `nextById`, `prevById` is next and previous values by id table. `mutation` is the mutation object.
```js
onMutate(nextById, prevById) {
	if (nextById.doc1 !== prevById.doc1) {
		// do something
	}
}
```

### dependencies: Array of other collection selectors
depended collections will be created before this collection created.
```js
const Roles = defineCollection('roles', {})
const Users = defineCollection('users', { dependencies: [Roles] })
```

### initState
another way to setup init collection state. With `{ byId: {}, originals: {}, requests: {} }` object tables.
```js
defineCollection('users', {
  initState: {
    // byId is table of docs
    byId: {
      'user-1': { _id: 'user-1', name: 'John' },
    },
    // originals is table of modified docs' originals
    originals: {
      'user-1': { _id: 'user-1', name: 'Old Name' },
    },
    // requests is request cache
    requests: {},
  },
})
```
