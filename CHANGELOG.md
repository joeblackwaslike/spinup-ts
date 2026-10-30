# Changelog

## [0.4.4](https://github.com/joeblackwaslike/spinup-ts/compare/spinup-ts-v0.4.3...spinup-ts-v0.4.4) (2026-10-30)


### Bug Fixes

* **migrate:** close workflow, build-script and nested-app migration gaps ([#21](https://github.com/joeblackwaslike/spinup-ts/issues/21)) ([6084d25](https://github.com/joeblackwaslike/spinup-ts/commit/6084d25dd706cfac5e7eba5f8acfaffc7bf776e8))

## [0.4.3](https://github.com/joeblackwaslike/spinup-ts/compare/spinup-ts-v0.4.2...spinup-ts-v0.4.3) (2026-10-29)


### Bug Fixes

* **migrate:** set up pnpm and Bun in every workflow job, switch setup-node cache to pnpm ([#19](https://github.com/joeblackwaslike/spinup-ts/issues/19)) ([c123c63](https://github.com/joeblackwaslike/spinup-ts/commit/c123c63d9ec3cce53ebb7784201fffff762040f8))

## [0.4.2](https://github.com/joeblackwaslike/spinup-ts/compare/spinup-ts-v0.4.1...spinup-ts-v0.4.2) (2026-10-29)


### Bug Fixes

* **migrate:** preserve existing JSON indentation ([#17](https://github.com/joeblackwaslike/spinup-ts/issues/17)) ([0e53803](https://github.com/joeblackwaslike/spinup-ts/commit/0e538031673ad9c1ba143b3e8e2c8138f614a31e))

## [0.4.1](https://github.com/joeblackwaslike/spinup-ts/compare/spinup-ts-v0.4.0...spinup-ts-v0.4.1) (2026-10-29)


### Bug Fixes

* **migrate:** pnpm import the old lockfile so resolved versions carry over ([#15](https://github.com/joeblackwaslike/spinup-ts/issues/15)) ([82fb3a6](https://github.com/joeblackwaslike/spinup-ts/commit/82fb3a618c9d7cee6ee6d392b5171b14f17c1323))

## [0.4.0](https://github.com/joeblackwaslike/spinup-ts/compare/spinup-ts-v0.3.1...spinup-ts-v0.4.0) (2026-10-29)


### Features

* **update:** --only flag to restrict updates to a subset ([#13](https://github.com/joeblackwaslike/spinup-ts/issues/13)) ([ce16391](https://github.com/joeblackwaslike/spinup-ts/commit/ce16391304b7761fcb8bf74b8233b156256efd20))

## [0.3.1](https://github.com/joeblackwaslike/spinup-ts/compare/spinup-ts-v0.3.0...spinup-ts-v0.3.1) (2026-10-29)


### Bug Fixes

* **ci:** exclude release-please-managed files from biome ([#10](https://github.com/joeblackwaslike/spinup-ts/issues/10)) ([41edc7c](https://github.com/joeblackwaslike/spinup-ts/commit/41edc7c012cddeafe4113077ef61a1137979546f))
* **migrate:** keep npm publish, map --workspace to --filter, resolve allowBuilds placeholders ([#12](https://github.com/joeblackwaslike/spinup-ts/issues/12)) ([f7a3a9d](https://github.com/joeblackwaslike/spinup-ts/commit/f7a3a9d5290bd53cea5b36850fa71f81f4bc04df))

## [0.3.0](https://github.com/joeblackwaslike/spinup-ts/compare/spinup-ts-v0.2.1...spinup-ts-v0.3.0) (2026-10-29)


### Features

* pnpm + Bun toolchain, update --yes toolchain migration, devcontainer sync ([#8](https://github.com/joeblackwaslike/spinup-ts/issues/8)) ([85ba07b](https://github.com/joeblackwaslike/spinup-ts/commit/85ba07bb749b3f9553d0a769a673097813ff5460))

## [0.2.1](https://github.com/joeblackwaslike/spinup-ts/compare/spinup-ts-v0.2.0...spinup-ts-v0.2.1) (2026-08-30)


### Bug Fixes

* scaffold and update commands now set export.auto=true and use --shared-server ([b17705b](https://github.com/joeblackwaslike/spinup-ts/commit/b17705bb78ee38d10e3635ba924f28539a387d24))

## [0.2.0](https://github.com/joeblackwaslike/spinup-ts/compare/spinup-ts-v0.1.0...spinup-ts-v0.2.0) (2026-06-11)


### Features

* **template:** add .tool-versions with dynamic node version ([c2e5fbe](https://github.com/joeblackwaslike/spinup-ts/commit/c2e5fbe251ec88b94c827224e270c07c91c1e1ea))
