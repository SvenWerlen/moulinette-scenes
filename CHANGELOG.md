# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.3.6] - 2022-09-04
### Fixed
- 3.3.3: folder view doesn't list subfolders systematically
- 3.3.2: Local scenes (indexed) are wrongly set as "showcase content"
- 3.3.1: #40 Non-host GMs can't use Moulinette for games hosted on The Forge
- 3.3.4: Conflict between Moulinette Scenes and MBE (Moulinette Browser Extension)
- 3.3.7: support scenes from V10

## [3.3.0] - 2022-05-15
### Changed
- Manage sources (for indexing process)

## [3.2.4] - 2021-04-09
### Fixed
- 3.2.1 : check that Library Scene Packer is enabled/installed
- 3.2.2 : fix broken previews for newest packs from BeneosBattlemaps
- 3.2.3 : fixes for ScenePacker integration
- 3.2.4 : resiliency against unexpected errors (index scenes)
### Changed
- Scene Packer (better integration)
- Japanese translations

## [3.1.1] - 2021-01-08
### Fixed
- 3.1.1: fix scene indexing on The Forge (not indexing User Data folder)
### Changed
- Scenes local export (used by some creators)

## [3.0.1] - 2021-12-24
### Fixed
- 3.0.1 : V9 scene import does not nest folders (Issue #28)
### Changed
- Support for FVTT 9.x

## [2.12.3] - 2021-12-21
### Fixed
- 2.12.1: improve error logs (when export doesn't work)
- 2.12.2: improve error logs (when download throws an exception)
- 2.12.3: scenes corrupt if they have tiles/background using the same name
### Added
- Export scenes directly to Moulinette Cloud (Private Storage)

## [2.11.0] - 2021-10-16
### Changed
- Improved scene packer integration

## [2.10.1] - 2021-10-11
### Fixed
- Thumbnail used as background image
- Index local scenes (old implementation based on moulinette.json file)
### Added
- Export folder of scenes for Moulinette Cloud

## [2.9.0] - 2021-09-25
### Fixed
- Support for 0.8.9
### Added
- Support for Moulinette Cloud (private storage)
- Previews (available scenes on Moulinette Cloud)
- Export a scene for Moulinette Cloud

## [2.8.3] - 2021-08-21
### Fixed
- 2.8.1 & 2.8.2: Indexing scenes from Forge Bazaar not working
- 2.8.3: Share scene removed (not supported any more)
### Added
- Indexing scenes from local compendia (comendiums). Many thanks to Rafał Lach (https://github.com/rlach) for this PR!

## [2.7.1] - 2021-07-03
### Added
- Display filename on mouse over
- Drag & drop map as a tile
### Fixed
- 2.7.1: replaceAll not available on FVTT 0.7.x

## [2.6.0] - 2021-06-18
### Added
- Scene added into its own folder structure

## [2.5.0] - 2021-06-16
### Added
- Browse mode by creator (rather than pack)

## [2.4.0] - 2021-06-13
### Added
- Resolution (HD/4K) based on naming convention
### Changed
- Close Preview as soon as download starts (+ message)

## [2.3.0] - 2021-06-06
### Added
- Support for new view mode (browse)

## [2.2.0] - 2021-05-29
### Added
- Support for assets caching

## [2.1.0] - 2021-05-27
### Added
- Scan images as maps (moulinette.json)

## [2.0.0] - 2021-05-24
### Added
- Compatibility with FVTT 0.8.5

## [1.4.0] - 2021-05-22
### Added
- Support for complex maps (with dependencies)

## [1.3.1] - 2021-05-15
### Fixed
- S3 : scene images won't show
### Changed
- Improved scene look-and-feel

## [1.2.0] - 2021-04-28
### Added
- Support for S3 as storage

## [1.1.0] - 2021-04-17
### Added
- Share a scene

## [1.0.2] - 2021-04-16
### Added
- Browse scenes
- French translations
