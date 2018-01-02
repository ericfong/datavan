**datavan: redux with mongodb api and can sync with server**

![https://img.shields.io/npm/v/datavan.svg](https://img.shields.io/npm/v/datavan.svg?style=flat-square)
[![state](https://img.shields.io/badge/state-alpha-green.svg?style=flat-square)]()
[![npm](https://img.shields.io/npm/dt/datavan.svg?maxAge=2592000&style=flat-square)]() [![npm](https://img.shields.io/npm/l/datavan.svg?style=flat-square)]()

**Features**

* based on [redux](https://www.npmjs.com/package/redux)
* mongodb-like find(), update() api
* customizable fetch, submit server logic
* built-in reselect-like memoizing layer
* design with offline in mind (persistent, conflict-resolve on your own)
* supports server rendering
* code in es6, support tree-shaking

**How It works?**

During find(), datavan will query your local-data first. If local-data is missing, it will call your onFetch() as a side effect and update the local-data.

**Table of Contents**

<!-- TOC START min:1 max:3 link:true update:true -->

* [Getting Started](#getting-started)
* [Upgrade from (2.7.3)](#upgrade-from-273)
* [Define Collections and Enhancer for redux](#define-collections-and-enhancer-for-redux)
  * [datavanEnhancer({ collections })](#datavanenhancer-collections-)
* [Collection Functions](#collection-functions)
  * [find(state, collection, query, [option])](#findstate-collection-query-option)
  * [findAsync(state, collection, query, [option])](#findasyncstate-collection-query-option)
  * [findOne(state, collection, query, [option])](#findonestate-collection-query-option)
  * [get(state, collection, id)](#getstate-collection-id)
  * [getAsync(state, collection, query, [option])](#getasyncstate-collection-query-option)
  * [setAll(state, collection, valuesTable)](#setallstate-collection-valuestable)
  * [getOriginals(state, collection)](#getoriginalsstate-collection)
  * [getSubmits(state, collection)](#getsubmitsstate-collection)
  * [set(state, collection, id, doc) | set(state, collection, doc)](#setstate-collection-id-doc--setstate-collection-doc)
  * [del(state, collection, id)](#delstate-collection-id)
  * [insert(state, collection, doc | docs)](#insertstate-collection-doc--docs)
  * [update(state, collection, query, update)](#updatestate-collection-query-update)
  * [remove(state, collection, query)](#removestate-collection-query)
  * [invalidate(state, collection, ids)](#invalidatestate-collection-ids)
  * [reset(state, collection, ids, option)](#resetstate-collection-ids-option)
  * [getAll(state, collection)](#getallstate-collection)
  * [submit(state, collection, onSubmitFunc)](#submitstate-collection-onsubmitfunc)
  * [load(state, collection, data, option)](#loadstate-collection-data-option)
* [Collection Spec](#collection-spec)
  * [onFetch(fetchQuery, option, collection)](#onfetchfetchquery-option-collection)
  * [onSubmit(submits, collection)](#onsubmitsubmits-collection)
  * [cast(doc)](#castdoc)
  * [idField](#idfield)
  * [genId()](#genid)
  * [getFetchKey(fetchQuery, option)](#getfetchkeyfetchquery-option)
  * [getAllHook()](#getallhook)
  * [getHook(id, option)](#gethookid-option)
  * [onSetAll(newDocs, option)](#onsetallnewdocs-option)
  * [initState](#initstate)

<!-- TOC END -->

**Other Docs**

* [Server Rendering](https://github.com/ericfong/datavan/blob/master/doc/Server_Rendering.md)
* [Store functions](https://github.com/ericfong/datavan/blob/master/doc/Store_Functions.md)
* [Plugins](https://github.com/ericfong/datavan/blob/master/doc/Plugins.md)
* [Util functions](https://github.com/ericfong/datavan/tree/master/doc/util)

# Getting Started

```js
import { createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { datavanEnhancer, findOne } from 'datavan'

// defined collection called 'users'
const collections = {
  users: {
    onFetch(collection, query, option) {
      return Promise.resolve([{ _id: 'id', name: 'john' }])
    },
  },
}

const PureComponent = ({ user }) => <div>{(user && user.name) || 'No Name'}</div>

// connect
const MyApp = connect(
  (state, { name }) => {
    // query by [mingo](https://www.npmjs.com/package/mingo)
    const query = { name }
    return {
      user: findOne(state, 'users', query),
      // first call result will be undefined
      // after HTTP response and cached, connect will be re-run
      // so, second result will get user object
    }
  },
  (dispatch, { name }) => {
    // update by [immutability-helper](https://www.npmjs.com/package/immutability-helper)
    const update = { $merge: { name: 'smith' } }
    return {
      modifyUser: () => update(dispatch, 'users', { name }, update),
    }
  }
)(PureComponent)

// createStore
const store = createStore(null, null, datavanEnhancer({ collections }))

render(
  <Provider store={store}>
    <MyApp name="john" />
  </Provider>
)
```

# Upgrade from (2.7.3)

* use `datavanEnhancer({ collections })` instead of `defineCollection()`. Or temp migrate using

```js
const Users = defineCollection(...)
const collections = {
  users: Users.spec,
}
createStore(reducer, preloadedState, datavanEnhancer({ collections }))
```

* use `find(state, 'users')` instead of `find(Users(state))`

# Define Collections and Enhancer for redux

### datavanEnhancer({ collections })

create datavan enhancer for redux

```js
import { datavanEnhancer, datavanReducer } from 'datavan'

const collections = {
  users: { idField: 'id', ...spec },
}

const store = createStore(reducer, preloadedState, datavanEnhancer({ collections }))

// if you use combineReducers, you also need to use `datavanReducer`
const store = createStore(combineReducers({ ..., datavan: datavanReducer }), preloadedState, datavanEnhancer({ collections }))

find(store, 'users', query)
```

# Collection Functions

### find(state, collection, query, [option])

Return: Array of documents

* state: redux state or dispatch function or store object
* collection: collection name
* query: Array<id> | query-object (mongodb like query object, we use [mingo](https://www.npmjs.com/package/mingo) to filter documents)
* option support 'sort','limit','skip'. Like mongo/monk api
* option support 'keyBy','keyByValue','groupBy','map','distinct'. Use lodash to implement

```js
arr = find(
  state,
  'users',
  { name: 'john' },
  {
    sort: { createdAt: -1 },
    limit: 10,
    skip: 20,
    // one of keyBy, groupBy, map
    keyBy: 'username',
    groupBy: 'shortId',
    map: 'name', // like pluck
  }
)
```

### findAsync(state, collection, query, [option])

Async function that always fetch and find data from server

### findOne(state, collection, query, [option])

like find() but return a single document

```js
doc = findOne(state, 'users', query)
```

### get(state, collection, id)

```js
doc = get(state, 'users', 'id-123')
```

### getAsync(state, collection, query, [option])

### setAll(state, collection, valuesTable)

set a table of documents into collection

```js
setAll(state, 'users', { key: doc, key2: doc2 })
```

### getOriginals(state, collection)

get local changed documents' originals

```js
const originalDocs = getOriginals(state, 'users')
```

### getSubmits(state, collection)

get local changed documents

```js
const dirtyDocs = getSubmits(state, 'users')
```

### set(state, collection, id, doc) | set(state, collection, doc)

```js
set(state, 'users', 'id-123', { _id: 'id-123', name: 'Mary' })
set(state, 'users', { _id: 'id-123', name: 'Mary' })
```

### del(state, collection, id)

```js
del(state, 'users', 'id-123')
```

### insert(state, collection, doc | docs)

Return: inserted docs

```js
insertedDoc = insert(state, 'users', { name: 'Mary' })
insertedDocs = insert(state, 'users', [{ name: 'Mary' }, { name: 'John' }])
```

### update(state, collection, query, update)

* update operations based on [immutability-helper](https://www.npmjs.com/package/immutability-helper)

```js
update(state, 'users', { name: 'Mary' }, { $merge: { name: 'Mary C' } })
```

### remove(state, collection, query)

remove all docs that match the query

```js
remove(state, 'users', { name: 'May' })
```

### invalidate(state, collection, ids)

invalidate cache and re-fetch in future get/find

```js
invalidate(state, 'users', ['id-123', 'query-fetchKey'])
// OR invalidate all
invalidate(state, 'users')
```

### reset(state, collection, ids, option)

reset local change and re-fetch in future get/find

```js
reset(state, 'users', ['id-123'])
// OR invalidate all
reset(state, 'users')
```

### getAll(state, collection)

get all documents. This won't trigger onFetch()

```js
const docsTable = getAll(state, 'users')
```

### submit(state, collection, onSubmitFunc)

submit collection with onSubmitFunc. If onSubmitFunc is missing, defined onSubmit will be used

```js
await submit(state, 'users')
```

### load(state, collection, data, option)

load bulk data into store. data can be

* Array of docs
* Or a object with `{ byId: {}, originals: {}, fetchAts: {} }`
* Or Table of docs

```js
// Array of docs
load(users, [{ _id: 'user-1', name: 'John' }])

// Or a object with at least one of `{ byId: {}, originals: {}, fetchAts: {} }`
load(users, {
  // byId is table of docs
  byId: {
    'user-1': { _id: 'user-1', name: 'John' },
  },
  // originals is table of modified docs' originals
  originals: {
    'user-1': { _id: 'user-1', name: 'Old Name' },
  },
  // fetchAts is server fetched queries times (msec, to prevent re-fetch after server rendering)
  fetchAts: {},
})

// Or Table of docs (byId)
load(users, {
  'user-1': { _id: 'user-1', name: 'John' },
})
```

Different between load() and setAll()

* setAll() data will consider as local-changes and trigger re-render
* load() data will consider as fill data from backend and trigger re-render

### plugBrowser

get and listen to browser resize, will mixin `getWidth()` and `getHeight()` functions

```js
datavanEnhancer({ collections: { browser: plugBrowser({}) } }) // plugBrowser is a object
```

# Collection Spec

spec fields that can be used in customization

### onFetch(fetchQuery, option, collection)

async fetch function (default: `undefined`). Should return array or map of documents

```js
const collectionSpec = {
  onFetch(query, option) {
    return fetch('restful-api?name=john')
  },
}
```

### onSubmit(submits, collection)

async submit function (default: `undefined`). Should return array or map of documents. Return `false` means submit cancelled.

```js
const collectionSpec = {
  onSubmit(submits) {
    return fetch('restful-api', { method: 'POST', body: JSON.stringify(submits) })
  },
}
```

### cast(doc)

cast and convert doc fields. Return: casted doc

```js
const collectionSpec = {
  cast(doc) {
    doc.createdAt = new Date(doc.createdAt)
    return doc
  },
}
```

### idField

id field for document (default: `_id`)

### genId()

generate a new tmp id string

### getFetchKey(fetchQuery, option)

calculate and return fetchKey (to determine cache hit or miss) from fetchQuery

```js
const collectionSpec = {
  getFetchKey(fetchQuery) {
    return 'generated unique cache key from fetchQuery'
  },
}
```

### getAllHook()

sync get all documents function. Return: map of documents (keyed by idField)

```js
const collectionSpec = {
  getAllHook(next, collection) {
    return { ...table_of_docs }
  },
}
```

### getHook(id, option)

sync get one document function. Return: document

```js
const collectionSpec = {
  getHook(next, collection, id) {
    return storage.getItem(id)
  },
}
```

### onSetAll(newDocs, option)

called only when collection setAll or other updates.

```js
const collectionSpec = {
  setAllHook(next, collection, change, option) {
    _.each(change, (value, key) => {
      if (key === '$unset') {
        _.each(value, k => storage.removeItem(k))
        return
      }
      storage.setItem(key, value)
    })
  },
}
```

### initState

another way to setup initial collection data. With `{ byId: {}, originals: {}, fetchAts: {} }` object tables.

```js
const collectionSpec = {
  initState: {
    // byId is table of docs
    byId: {
      'user-1': { _id: 'user-1', name: 'John' },
    },
    // originals is table of modified docs' originals
    originals: {
      'user-1': { _id: 'user-1', name: 'Old Name' },
    },
    // fetchAts is server fetched queries times (msec, to prevent re-fetch after server rendering)
    fetchAts: {},
  },
}
```
