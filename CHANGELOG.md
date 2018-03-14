# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="3.5.5"></a>
## [3.5.5](https://github.com/ericfong/datavan/compare/v3.5.4...v3.5.5) (2018-03-14)


### Bug Fixes

* add pure hoc to connectOnChange ([d906ee1](https://github.com/ericfong/datavan/commit/d906ee1))
* inResponses for list and byId type query and sorting ([95af303](https://github.com/ericfong/datavan/commit/95af303))
* recall prefer collection-defined function and with collection as scope ([1c2f33b](https://github.com/ericfong/datavan/commit/1c2f33b))



<a name="3.5.4"></a>
## [3.5.4](https://github.com/ericfong/datavan/compare/v3.5.3...v3.5.4) (2018-03-13)


### Bug Fixes

* connectOnChange for virtual collection and default redux connect pure as false ([3db648c](https://github.com/ericfong/datavan/commit/3db648c))
* deprecate recall default function ([5314333](https://github.com/ericfong/datavan/commit/5314333))
* ensure find '' and [] return empty array ([8cade44](https://github.com/ericfong/datavan/commit/8cade44))
* refactor query function to query.js ([2c1a3d3](https://github.com/ericfong/datavan/commit/2c1a3d3))
* use whole state to check cache instead of byId only ([c115517](https://github.com/ericfong/datavan/commit/c115517))


### Features

* omit $$ for query (use with inResponse) ([01d0971](https://github.com/ericfong/datavan/commit/01d0971))



<a name="3.5.3"></a>
## [3.5.3](https://github.com/ericfong/datavan/compare/v3.5.2...v3.5.3) (2018-03-09)


### Bug Fixes

* add test to load same $submittedIds again ([34adb4c](https://github.com/ericfong/datavan/commit/34adb4c))
* don't move submitted docs if docs is not exists ([9edac83](https://github.com/ericfong/datavan/commit/9edac83))
* ensure fetchingAt is set to getState() instantaneously ([6fa7f2b](https://github.com/ericfong/datavan/commit/6fa7f2b))
* refactor and separate code for isAllIdHit() ([26cf6cd](https://github.com/ericfong/datavan/commit/26cf6cd))
* refactor funcs to collection/index and prepare to remove submitter totally ([919b343](https://github.com/ericfong/datavan/commit/919b343))
* shortcut empty query ([cb1ad11](https://github.com/ericfong/datavan/commit/cb1ad11))



<a name="3.5.2"></a>
## [3.5.2](https://github.com/ericfong/datavan/compare/v3.5.1...v3.5.2) (2018-03-08)


### Bug Fixes

* add null conf handling to connectOnChange ([47815ed](https://github.com/ericfong/datavan/commit/47815ed))
* mark deprecating ([56cd256](https://github.com/ericfong/datavan/commit/56cd256))
* rename directFetch to inResponse and test on find inResponse ([9c6b91c](https://github.com/ericfong/datavan/commit/9c6b91c))
* speed by find for empty query ([3b78ae0](https://github.com/ericfong/datavan/commit/3b78ae0))
* use encodeURIComponent to wrap querystring key and value ([bb71566](https://github.com/ericfong/datavan/commit/bb71566))


### Features

* add experiential directFetch option to find ([09143e5](https://github.com/ericfong/datavan/commit/09143e5))



<a name="3.5.1"></a>
## [3.5.1](https://github.com/ericfong/datavan/compare/v3.5.0...v3.5.1) (2018-02-28)


### Bug Fixes

* engine set to node LTS ([261ffce](https://github.com/ericfong/datavan/commit/261ffce))


### Features

* add recall to replace getIndex and calcOnChange ([7573193](https://github.com/ericfong/datavan/commit/7573193))



<a name="3.5.0"></a>
# [3.5.0](https://github.com/ericfong/datavan/compare/v3.4.5...v3.5.0) (2018-02-15)


### Bug Fixes

* allow mutateAll using mutate only ([26124ba](https://github.com/ericfong/datavan/commit/26124ba))
* cannot mutate with null mutation ([7bd8482](https://github.com/ericfong/datavan/commit/7bd8482))
* test ([dbe0376](https://github.com/ericfong/datavan/commit/dbe0376))
* withMethods can handle null spec ([426062f](https://github.com/ericfong/datavan/commit/426062f))


### Features

* add fetchingAt state ([1c18d49](https://github.com/ericfong/datavan/commit/1c18d49))



<a name="3.4.5"></a>
## [3.4.5](https://github.com/ericfong/datavan/compare/v3.4.4...v3.4.5) (2018-02-10)


### Bug Fixes

* submit, if has $submittedIds, consider as clean submit-data by itself ([47ab805](https://github.com/ericfong/datavan/commit/47ab805))



<a name="3.4.4"></a>
## [3.4.4](https://github.com/ericfong/datavan/compare/v3.4.3...v3.4.4) (2018-01-31)


### Bug Fixes

* add back getSetter ([8ee7365](https://github.com/ericfong/datavan/commit/8ee7365))



<a name="3.4.3"></a>
## [3.4.3](https://github.com/ericfong/datavan/compare/v3.4.1...v3.4.3) (2018-01-31)


### Bug Fixes

* defaultGetQueryString should convert to normal query to make API easy to write ([8bfb8f6](https://github.com/ericfong/datavan/commit/8bfb8f6))
* enhance cast logic ([b48f68c](https://github.com/ericfong/datavan/commit/b48f68c))



<a name="3.4.2"></a>
## [3.4.2](https://github.com/ericfong/datavan/compare/v3.4.1...v3.4.2) (2018-01-31)


### Bug Fixes

* defaultGetQueryString should convert to normal query to make API easy to write ([8bfb8f6](https://github.com/ericfong/datavan/commit/8bfb8f6))
* enhance cast logic ([b48f68c](https://github.com/ericfong/datavan/commit/b48f68c))



<a name="3.4.1"></a>
## [3.4.1](https://github.com/ericfong/datavan/compare/v3.4.0...v3.4.1) (2018-01-29)



<a name="3.4.0"></a>
# [3.4.0](https://github.com/ericfong/datavan/compare/v3.3.8...v3.4.0) (2018-01-29)


### Bug Fixes

* constant and use back TMP_ID_PREFIX ([c778602](https://github.com/ericfong/datavan/commit/c778602))
* fix test and add virtual collection test ([60dce62](https://github.com/ericfong/datavan/commit/60dce62))
* remove deprecated functions ([c548c39](https://github.com/ericfong/datavan/commit/c548c39))
* support lodash orderBy syntax ([aa973fe](https://github.com/ericfong/datavan/commit/aa973fe))
* use dv~ instead of dv=, for tmp id prefix ([df0de58](https://github.com/ericfong/datavan/commit/df0de58))


### BREAKING CHANGES

* remove deprecated functions



<a name="3.3.8"></a>
## [3.3.8](https://github.com/ericfong/datavan/compare/v3.3.7...v3.3.8) (2018-01-25)


### Bug Fixes

* add deprecated warn for old datavanReducer ([c30d2e6](https://github.com/ericfong/datavan/commit/c30d2e6))
* genTmpId should be wrapStore and it dep on system.deviceName setting ([050111b](https://github.com/ericfong/datavan/commit/050111b))
* rename store.collections to store.vanDb and move out vanCtx.mutates to vanMutates ([ec080dd](https://github.com/ericfong/datavan/commit/ec080dd))
* reset should delete all docs for table without onFetch in collection conf ([e073f2a](https://github.com/ericfong/datavan/commit/e073f2a))


### Features

* add default system collection which contain key and value pairs for deviceName ([32d02c4](https://github.com/ericfong/datavan/commit/32d02c4))
* add onInsert handler ([ca9ad1f](https://github.com/ericfong/datavan/commit/ca9ad1f))
* add tmpIdRegExp to match tmpId Str ([c38ab34](https://github.com/ericfong/datavan/commit/c38ab34))



<a name="3.3.7"></a>
## [3.3.7](https://github.com/ericfong/datavan/compare/v3.3.6...v3.3.7) (2018-01-23)


### Bug Fixes

* doc and getIndex API ([225f460](https://github.com/ericfong/datavan/commit/225f460))
* doc for cast, connectOnChange and calcOnChange ([3bb0426](https://github.com/ericfong/datavan/commit/3bb0426))
* simplify connectOnChange API and auto detect collection access during map-state ([be7e741](https://github.com/ericfong/datavan/commit/be7e741))
* unify load prelod and initState and loadCollections. Can re-cast all docs if specified loadActionTypes ([fe4a187](https://github.com/ericfong/datavan/commit/fe4a187))


### Features

* add back searchObjects ([a840c64](https://github.com/ericfong/datavan/commit/a840c64))



<a name="3.3.6"></a>
## [3.3.6](https://github.com/ericfong/datavan/compare/v3.3.5...v3.3.6) (2018-01-18)


### Bug Fixes

* enhance cast speed remove deprecated test ([e3f26bc](https://github.com/ericfong/datavan/commit/e3f26bc))
* eslint ([7dbba1b](https://github.com/ericfong/datavan/commit/7dbba1b))
* use less hacky way to cast mutated docs ([47bceee](https://github.com/ericfong/datavan/commit/47bceee))



<a name="3.3.5"></a>
## [3.3.5](https://github.com/ericfong/datavan/compare/v3.3.4...v3.3.5) (2018-01-17)



<a name="3.3.4"></a>
## [3.3.4](https://github.com/ericfong/datavan/compare/v3.3.3...v3.3.4) (2018-01-16)


### Bug Fixes

* use queryString as fetchKey (for cache) ([50e473d](https://github.com/ericfong/datavan/commit/50e473d))



<a name="3.3.3"></a>
## [3.3.3](https://github.com/ericfong/datavan/compare/v3.3.2...v3.3.3) (2018-01-11)


### Bug Fixes

* filterHook which need to handle both pre and post find processing ([30f77f8](https://github.com/ericfong/datavan/commit/30f77f8))



<a name="3.3.2"></a>
## [3.3.2](https://github.com/ericfong/datavan/compare/v3.3.1...v3.3.2) (2018-01-11)



<a name="3.3.1"></a>
## [3.3.1](https://github.com/ericfong/datavan/compare/v3.3.0...v3.3.1) (2018-01-11)


### Features

* simplify and remove all hooks ([2480a0a](https://github.com/ericfong/datavan/commit/2480a0a))


### BREAKING CHANGES

* remove onInit, onLoad, getHook, findHook, findAsyncHook,
filterHook, postFindHook



<a name="3.3.0"></a>
# [3.3.0](https://github.com/ericfong/datavan/compare/v3.2.0...v3.3.0) (2018-01-10)


### Features

* add getIndex func ([d2c0daa](https://github.com/ericfong/datavan/commit/d2c0daa))
* export queryTester ([9151647](https://github.com/ericfong/datavan/commit/9151647))



<a name="3.2.0"></a>
# [3.2.0](https://github.com/ericfong/datavan/compare/v3.1.0...v3.2.0) (2018-01-09)


### Features

* add findInState ([2e31e9b](https://github.com/ericfong/datavan/commit/2e31e9b))
* memorizer ([b0e77fb](https://github.com/ericfong/datavan/commit/b0e77fb))
* move getState(), addMutation(), getAll() to be overridable ([5ad3762](https://github.com/ericfong/datavan/commit/5ad3762))
* re-export compose from recompose and enhance warning messages ([06df59f](https://github.com/ericfong/datavan/commit/06df59f))
* remove auto-json-base caching layer ([ced4a03](https://github.com/ericfong/datavan/commit/ced4a03))
* simplify load() ([9f41b33](https://github.com/ericfong/datavan/commit/9f41b33))



<a name="3.1.0"></a>
# [3.1.0](https://github.com/ericfong/datavan/compare/v3.0.2...v3.1.0) (2018-01-05)


### Features

* connectOnChange and runOnChange api ([1319d3e](https://github.com/ericfong/datavan/commit/1319d3e))



<a name="3.0.2"></a>
## [3.0.2](https://github.com/ericfong/datavan/compare/v3.0.1...v3.0.2) (2017-12-29)


### Bug Fixes

* browser height ([f7652e2](https://github.com/ericfong/datavan/commit/f7652e2))



<a name="3.0.1"></a>
## [3.0.1](https://github.com/ericfong/datavan/compare/v3.0.0...v3.0.1) (2017-12-20)


### Bug Fixes

* gc for collection without onFetch ([a9f5673](https://github.com/ericfong/datavan/commit/a9f5673))



<a name="3.0.0"></a>
# [3.0.0](https://github.com/ericfong/datavan/compare/v2.11.1...v3.0.0) (2017-12-20)


### Bug Fixes

* re-organize code into less files ([aa1733a](https://github.com/ericfong/datavan/commit/aa1733a))
* remove deprecated functons ([b69c53a](https://github.com/ericfong/datavan/commit/b69c53a))
* rename processOptionHook to postFindHook ([89ff490](https://github.com/ericfong/datavan/commit/89ff490))


### BREAKING CHANGES

* rename processOptionHook to postFindHook
* remove deprecated functons



<a name="2.11.1"></a>
## [2.11.1](https://github.com/ericfong/datavan/compare/v2.11.0...v2.11.1) (2017-12-20)



<a name="2.11.0"></a>
# [2.11.0](https://github.com/ericfong/datavan/compare/v2.10.4...v2.11.0) (2017-12-14)


### Bug Fixes

* plugBrowser to dispatch mutations ([610840d](https://github.com/ericfong/datavan/commit/610840d))


### Features

* add run() ([c002f06](https://github.com/ericfong/datavan/commit/c002f06))



<a name="2.10.4"></a>
## [2.10.4](https://github.com/ericfong/datavan/compare/v2.10.3...v2.10.4) (2017-12-13)


### Bug Fixes

* tmp store mutations array and use wrapper to flush/dispatch mutations ([286c82d](https://github.com/ericfong/datavan/commit/286c82d))



<a name="2.10.3"></a>
## [2.10.3](https://github.com/ericfong/datavan/compare/v2.10.2...v2.10.3) (2017-12-12)


### Bug Fixes

* add fetchMaxAge, fix fetchAts, _byIds, httpFetcher ([f3c86a6](https://github.com/ericfong/datavan/commit/f3c86a6))



<a name="2.10.2"></a>
## [2.10.2](https://github.com/ericfong/datavan/compare/v2.10.1...v2.10.2) (2017-12-09)


### Bug Fixes

* combine fetchAts and _fetchAts and use addMutation ([e321e99](https://github.com/ericfong/datavan/commit/e321e99))



<a name="2.10.1"></a>
## [2.10.1](https://github.com/ericfong/datavan/compare/v2.10.0...v2.10.1) (2017-12-09)


### Features

* support mutate with array ([2da2ebc](https://github.com/ericfong/datavan/commit/2da2ebc))



<a name="2.10.0"></a>
# [2.10.0](https://github.com/ericfong/datavan/compare/v2.9.1...v2.10.0) (2017-12-07)


### Bug Fixes

* memoryFields need to be diff from fetchKey ([40e5e10](https://github.com/ericfong/datavan/commit/40e5e10))
* more likely to solve all ready promises ([d54f083](https://github.com/ericfong/datavan/commit/d54f083))



<a name="2.9.1"></a>
## [2.9.1](https://github.com/ericfong/datavan/compare/v2.9.0...v2.9.1) (2017-12-03)


### Features

* relay ready retry and ready message from worker will resolve all waiting ready ([9860295](https://github.com/ericfong/datavan/commit/9860295))



<a name="2.9.0"></a>
# [2.9.0](https://github.com/ericfong/datavan/compare/v2.8.0...v2.9.0) (2017-12-02)


### Bug Fixes

* removed warnings ([4695314](https://github.com/ericfong/datavan/commit/4695314))


### BREAKING CHANGES

* removed depreacted functions



<a name="2.8.0"></a>
# [2.8.0](https://github.com/ericfong/datavan/compare/v2.7.2...v2.8.0) (2017-11-30)


### Bug Fixes

* prevent use collection.get() ([d743d26](https://github.com/ericfong/datavan/commit/d743d26))
