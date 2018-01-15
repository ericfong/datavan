**datavan: redux with mongodb api and can sync with server**

![https://img.shields.io/npm/v/datavan.svg](https://img.shields.io/npm/v/datavan.svg?style=flat-square)
[![state](https://img.shields.io/badge/state-alpha-green.svg?style=flat-square)]()
[![npm](https://img.shields.io/npm/dt/datavan.svg?maxAge=2592000&style=flat-square)]() [![npm](https://img.shields.io/npm/l/datavan.svg?style=flat-square)]()

**Features**

* based on [redux](https://www.npmjs.com/package/redux)
* mongodb-like find(), update() api
* design with offline in mind
* customizable server fetch, submit, persistent, conflict-resolve logic
* built-in reselect-like memoizing layer
* supports server rendering
* code in es6, support tree-shaking

**How It works?**

During find(), datavan will query your local-data first. If local-data is missing, it will call your onFetch() as a side effect and update the local-data.

**Table of Contents**

<!-- TOC START min:1 max:3 link:true update:true -->

* [Getting Started](#getting-started)
  * [connectOnChange](#connectonchange)
  * [datavanEnhancer](#datavanenhancer)
* [Collection Functions](#collection-functions)
  * [find](#find)
  * [findAsync](#findasync)
  * [findOne](#findone)
  * [get](#get)
  * [getAsync](#getasync)
  * [setAll](#setall)
  * [getOriginals](#getoriginals)
  * [getSubmits](#getsubmits)
  * [set](#set)
  * [del](#del)
  * [insert](#insert)
  * [update](#update)
  * [remove](#remove)
  * [invalidate](#invalidate)
  * [reset](#reset)
  * [getAll](#getall)
  * [submit](#submit)
  * [load](#load)
* [Collection Spec](#collection-spec)
  * [idField](#idfield)
  * [onFetch](#onfetch)
  * [onSubmit](#onsubmit)
  * [cast](#cast)
  * [genId](#genid)
  * [getFetchKey](#getfetchkey)
  * [initState](#initstate)
* [Store functions](#store-functions)
  * [getCollection](#getcollection)
  * [invalidateStore(store, option)](#invalidatestorestore-option)
  * [gcStore(store, option)](#gcstorestore-option)
  * [serverPreload(store, renderCallback)](#serverpreloadstore-rendercallback)
  * [getContext(store)](#getcontextstore)
  * [setContext(store, ctx)](#setcontextstore-ctx)
  * [loadCollections(store, collectionsData)](#loadcollectionsstore-collectionsdata)
* [Extension](#extension)
  * [getBrowserWidth / getBrowserHeight](#getbrowserwidth--getbrowserheight)
* [Upgrade from (2.7.3)](#upgrade-from-273)

<!-- TOC END -->

**Other Docs**

* [Server Rendering](https://github.com/ericfong/datavan/blob/master/doc/Server_Rendering.md)

# Getting Started

```js
import { createStore } from 'redux'
import { Provider, connect } from 'react-redux'
import { datavanEnhancer, findOne, connectOnChange } from 'datavan'

const PureComponent = props => <div>{props.user.name}</div>

// normal redux connect
const MyApp = connect(
  (state, { name }) => {
    const user = findOne(state, 'users' /* collection */, { name } /* mongo query syntax */)
    // first call result will be undefined
    // after HTTP response, connect will be re-run
    // second result will get user object
    return { user }
  },
  (dispatch, { name }) => {
    return {
      modifyUser: () => update(dispatch, 'users' /* collection */, { name } /* query */, { $merge: { name: 'smith' } } /* mongo update syntax */),
    }
  },
)(PureComponent)

// create redux store
const store = createStore(
  // reducer
  state => state,
  // preloadedState
  {},
  datavanEnhancer({
    collections: {
      // defined collection called 'users'
      users: {
        onFetch(collection, query, option) {
          return Promise.resolve([{ _id: 'id', name: 'john' }])
        },
      },
    },
  }),
)

render(
  <Provider store={store}>
    <MyApp name="john" />
  </Provider>,
)
```

* [query syntax from mingo](https://www.npmjs.com/package/mingo)
* [update syntax from immutability-helper](https://www.npmjs.com/package/immutability-helper)

### connectOnChange

```js
connectOnChange({ collections: string, props: string }, func)
```

You can also use connectOnChange to memoize connect function result

```js
const MyApp = connectOnChange(
  {
    collections: 'users, collectionA, collectionB',
    props: 'name',
  },
  (state, { name }) => {
    return { user: findOne(state, 'users', { name }) }
  },
)(PureComponent)
```

### datavanEnhancer

```js
datavanEnhancer({ collections })
```

define collections and create datavan enhancer for redux. Refer to [Collection Spec](#collection-spec) for more collection spec options

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

### find

```js
find(state, collection, query, [option])
// Return: Array of documents
```

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
  },
)
```

### findAsync

```js
findAsync(state, collection, query, [option])
```

Async function that always fetch and find data from server

### findOne

like find() but return a single document

```js
findOne(state, collection, query, [option])
doc = findOne(state, 'users', query)
```

### get

```js
get(state, collection, id)
doc = get(state, 'users', 'id-123')
```

### getAsync

```js
getAsync(state, collection, query, [option])
```

### setAll

set a table of documents into collection

```js
setAll(state, collection, valuesTable)
setAll(state, 'users', { key: doc, key2: doc2 })
```

### getOriginals

get local changed documents' originals

```js
getOriginals(state, collection)
const originalDocs = getOriginals(state, 'users')
```

### getSubmits

get local changed documents

```js
getSubmits(state, collection)
const dirtyDocs = getSubmits(state, 'users')
```

### set

```js
set(state, collection, id, doc) | set(state, collection, doc)
set(state, 'users', 'id-123', { _id: 'id-123', name: 'Mary' })
set(state, 'users', { _id: 'id-123', name: 'Mary' })
```

### del

```js
del(state, collection, id)
del(state, 'users', 'id-123')
```

### insert

Return: inserted docs

```js
insert(state, collection, doc | docs)
insertedDoc = insert(state, 'users', { name: 'Mary' })
insertedDocs = insert(state, 'users', [{ name: 'Mary' }, { name: 'John' }])
```

### update

* update operations based on [immutability-helper](https://www.npmjs.com/package/immutability-helper)

```js
update(state, collection, query, update)
update(state, 'users', { name: 'Mary' }, { $merge: { name: 'Mary C' } })
```

### remove

remove all docs that match the query

```js
remove(state, collection, query)
remove(state, 'users', { name: 'May' })
```

### invalidate

invalidate cache and re-fetch in future get/find

```js
invalidate(state, collection, ids)
invalidate(state, 'users', ['id-123', 'query-fetchKey'])
// OR invalidate all
invalidate(state, 'users')
```

### reset

reset local change and re-fetch in future get/find

```js
reset(state, collection, ids, option)
reset(state, 'users', ['id-123'])
// OR invalidate all
reset(state, 'users')
```

### getAll

get all documents. This won't trigger onFetch()

```js
getAll(state, collection)
const docsTable = getAll(state, 'users')
```

### submit

submit collection with onSubmitFunc. If onSubmitFunc is missing, defined onSubmit will be used

```js
promise = submit(state, collection, onSubmitFunc)
await submit(state, 'users')
```

### load

load bulk data into store. data can be

```js
load(state, collection, data, option)
```

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

# Collection Spec

options that can be used in [datavanEnhancer](#datavanenhancer)

### idField

id field for document (default: `_id`)

### onFetch

async fetch function (default: `undefined`). Should return array or map of documents

```js
const collectionSpec = {
  onFetch(query, option, collection) {
    return fetch('restful-api?name=john')
  },
}
```

### onSubmit

async submit function (default: `undefined`). Should return array or map of documents. Return `false` means submit cancelled.

```js
const collectionSpec = {
  onSubmit(submits, collection) {
    return fetch('restful-api', { method: 'POST', body: JSON.stringify(submits) })
  },
}
```

### cast

cast and convert doc fields. Return: casted doc

```js
const collectionSpec = {
  cast(doc) {
    doc.count = parseInt(doc.count)
    return doc
  },
}
```

### genId

generate a new tmp id string

### getFetchKey

calculate and return fetchKey (to determine cache hit or miss) from fetchQuery

```js
const collectionSpec = {
  getFetchKey(fetchQuery, option) {
    return 'generated unique cache key from fetchQuery'
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

# Store functions

### getCollection

get collection instance from redux store

```js
const store = createStore()
const collection = getCollection(store, 'collection-name')
```

### invalidateStore(store, option)

run auto invalidate on all collections

### gcStore(store, option)

run auto gc on all collections

### serverPreload(store, renderCallback)

render react components in server side. Reference to [Server Rendering](#server-rendering)

### loadCollections(store, collectionsData)

# Extension

### getBrowserWidth / getBrowserHeight

get width & height and listen to browser resize automatically

```js
const browserWidth = getBrowserWidth(state, collectionName, (widthKey = 'browserWidth'))
const browserHeight = getBrowserHeight(state, collectionName, (heightKey = 'browserHeight'))
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
