# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
