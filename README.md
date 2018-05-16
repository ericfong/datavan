**datavan: in-memory mongodb for react that can track changes and sync with server**

![https://img.shields.io/npm/v/datavan.svg](https://img.shields.io/npm/v/datavan.svg?style=flat-square)
[![state](https://img.shields.io/badge/state-alpha-green.svg?style=flat-square)]()
[![npm](https://img.shields.io/npm/dt/datavan.svg?maxAge=2592000&style=flat-square)]() [![npm](https://img.shields.io/npm/l/datavan.svg?style=flat-square)]()

**Features**

* based on [New React Context](https://reactjs.org/docs/context.html)
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
- [Getting Started](#getting-started)
- [Setup](#setup)
    - [createDb](#createdb)
    - [data inside db](#data-inside-db)
- [Better Performance](#better-performance)
    - [memoize result and auto re-run](#memoize-result-and-auto-re-run)
- [API](#api)
    - [find, pick](#find-pick)
    - [findAsync, pickAsync](#findasync-pickasync)
    - [findInMemory](#findinmemory)
    - [fetch](#fetch)
    - [get](#get)
    - [getById, getOriginals, getSubmits](#getbyid-getoriginals-getsubmits)
    - [insert](#insert)
    - [update](#update)
    - [remove](#remove)
    - [mutate](#mutate)
    - [set](#set)
    - [invalidate](#invalidate)
    - [reset](#reset)
    - [load](#load)
    - [recall](#recall)

<!-- TOC END -->

**Other Docs**

* [searchObjects](https://github.com/ericfong/datavan/blob/master/src/searchObjects/searchObjects.md)

# Getting Started

```js
import _ from 'lodash'
import { createDatavanContext } from 'datavan'

const Van = createDatavanContext({
  // defined collection called 'myUserTable'
  myUserTable: {
    onFetch(collection, query, option) {
      return Promise.resolve([{ _id: 'id', name: 'john' }])
    },
  },
})

render(
  <Van.Provider store={store}>
    ...
    <Van>
      {db => {
        // first call result will be undefined
        // after HTTP response, connect will be re-run
        // second result will get user object
        const users = db.find('myUserTable', { name: { $in: ['John'] } })

        const onClick = () => db.update('myUserTable', { name: 'John' }, { $merge: { name: 'smith' } })

        return (
          <button onClick={onClick}>
            {_.map(users, 'name').join()}
          </button>
        )
      }}
    </Van>
    ...
  </Van.Provider>
)
```

* [query syntax from mingo](https://www.npmjs.com/package/mingo)
* [update syntax from immutability-helper](https://www.npmjs.com/package/immutability-helper)

# Setup

### createDb

```js
import { createDb } from 'datavan'

const db = createDb({
  myUserTable: {
    // id field for document (default: `_id`)
    idField: 'id',

    // async fetch function (default: `undefined`). Should return array or map of documents
    onFetch(query, option, collection) {
      return fetch('restful-api?name=john')
    },

    // cast and convert doc fields. Return: casted doc
    // NOTE only cast to primitive types that can use === to compare. (DON'T cast to Date, Object, Array or anything that cannot be JSON.stringify)
    cast(doc) {
      doc.count = parseInt(doc.count, 10)
      // Can cast to Number as count === JSON.parse(JSON.stringify(count))
      doc.arr = 'a,b'.split(',')
      // Can cast to Number as arr !== JSON.parse(JSON.stringify(arr))
      return doc
    },

    onInsert(doc) {
    },

    onLoad(doc) {
    },

    // generate a new tmp id string (default: genId from datavan)
    genId: genId,

    getFetchQuery: (query, idField) => '',
    // calculate and return fetchKey (to determine cache hit or miss) from fetchQuery (default: defaultGetQueryString from datavan)
    getFetchKey: (query, option) => '',

    // another way to setup initial data. With `{ byId: {}, originals: {}, fetchAts: {} }` object tables.
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
  },
})

db.find('myUserTable', { name: 'John' })
```

### data inside db

datavan will store docs in the following structure

```js
const db = createDb()
db = {
  user_table: {
    submits: {
      id_1: {
        _id: 'id_1',
        name: 'John',
      },
      id_2: {
        _id: 'id_2',
        name: 'May',
      },
    },

    // table of modified docs' originals
    originals: {},
    preloads: {},

    // server fetch times/markers (msec, to prevent re-fetch after server rendering)
    fetchAts: {},
  },
}
```

# Better Performance

### memoize result and auto re-run

```js
import { createDatavanContext, getMemoizeHoc } from 'datavan'

const Van = createDatavanContext(...)
const withVan = getMemoizeHoc(Van)

const MyApp = withVan(
  // array of props that provide to map function
  ['name', 'role'],
  // map function
  (db, { name, role }) => {
    return { users: db.find('user_table', { name, role }) }
  }
)(ReactComponent)
```

# API

### find, pick

```js
db.find(collection, query, [option])
// Return: Array of documents
```

* collection: collection name
* query: Array<id> | query-object (mongodb like query object, we use [mingo](https://www.npmjs.com/package/mingo) to filter documents)

```js
arr = db.find('user_table', { name: 'john' })

// query starts with $$ which trigger find within the result from onFetch response
arr = db.find('user_table', { name: 'john', $$limit: 10, $$sort: ... })

userById = db.pick('user_table', { name: 'john' })
```

### findAsync, pickAsync

```js
db.findAsync(collection, query, [option])

byId = db.pickAsync(collection, query, [option])
```

Async function that always fetch and find data from server

### findInMemory

like find() but only find in local memory

### fetch

internally used by find(), findAsync() to call onFetch and return a raw result in promise. Without call findInMemory() after onFetch to normalise onFetch result.

### get

```js
doc = db.get('user_table', 'id-123')
```

### getById, getOriginals, getSubmits

```js
// get all documents. This won't trigger onFetch()
const docsTable = db.getById('user_table')

// get local changed documents
const dirtyDocs = db.getSubmits('user_table')

// get local changed documents' originals
const originalDocs = db.getOriginals('user_table')

const docsPreloads = db.getPreloads('user_table')
```

### insert

Return: inserted docs

```js
insertedDoc = db.insert('user_table', { name: 'Mary' })
// can also insert array
insertedDocs = db.insert('user_table', [{ name: 'Mary' }, { name: 'John' }])
```

### update

* update operations based on [immutability-helper](https://www.npmjs.com/package/immutability-helper)

```js
const query = { name: 'Mary' }
const mutation = { $merge: { name: 'Mary C' } }
db.update('user_table', query, mutation)
```

### remove

remove all docs that match the query

```js
db.remove('user_table', { name: 'May' })
```

### mutate

mutate documents using [immutability-helper](https://www.npmjs.com/package/immutability-helper) syntax

```js
// merge by doc id
db.mutate('user_table', 'id-123', { $merge: { name: 'Mary' } })

// merge by array of path
db.mutate('user_table', ['id-123', 'name'], { $set: 'Mary' })

// merge in many docs
db.mutate('user_table', { $merge: { docId1: doc1, docId2: doc2 } })
```

### set

shortcut of [mutate](#mutate) which always use `{ $set: value }`

### invalidate

```js
// invalidate all collections
db.invalidate()

// invalidate one collection (all docs)
db.invalidate('user_table')

// invalidate one collection (some docs)
db.invalidate('user_table', ['user-1', 'user-2'])
```

### reset

reset local change and re-fetch in future get/find

```js
// reset all collections
db.reset()

// reset one collection (all docs)
db.reset('user_table')

// reset one collection (some docs)
db.reset('user_table', ['user-1', 'user-2'])
```

### load

load bulk data into store. data can be

```js
db.load('user_table', data, option)
```

* Array of docs
* Or a object with `{ byId: {}, originals: {}, fetchAts: {} }`
* Or Table of docs

```js
// Array of docs
db.load('user_table', [{ _id: 'user-1', name: 'John' }])

// Or a object with at least one of `{ byId: {}, originals: {}, fetchAts: {} }`
db.load('user_table', {
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
  // submitted tmp and stored id mapping
  $submittedIds: { tmpId: storedId },
})

// Or Table of docs (byId)
db.load('user_table', {
  'user-1': { _id: 'user-1', name: 'John' },
})

// load collections
db.load({
  'user_table': {
    'user-1': { _id: 'user-1', name: 'John' },
  },
  'collection-2': {...}
})
```

* load() data will consider as fill data from backend and trigger re-render

### recall

call a function (anonymous or collection-defined) only-if store data or argument changed. If no changes, cached result will be used.

```js
// recall collection-defined function
const db = createDb({
  myUserTable: {
    groupByFunc(byId, arg1) {
      return _.groupBy(byId, arg1)
    },
  },
})
const result = db.recall('myUserTable', 'groupByFunc', 'arg1-value')
```
