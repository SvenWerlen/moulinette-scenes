# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [11.1.1] - 2023-06-08
### Fixed
- 11.1.1: Fix cloud export for V11
### Added
- Avif support

## [11.0.3] - 2023-05-07
### Fixed
- 11.0.3: Fix "assigment to constant" error
- 11.0.2: Fix paths for S3 (for files with special characters)
- 11.0.1: Official support for V11
### Changed
- Versionning changed to simpler incremental format.
- Scene thumbnails now generated into `moulinette/thumbs`
- Optimizations for The Forge (hosting provider) & S3
- Preview animated maps for ScenePacker packs
### Added
- Configuration to toggle generation of thumbnails for scenes
- Configuration to Download Scenes in top-level directory
- 10 filters (walls, tiles, lights, etc.)

## [10.6.1] - 2023-02-19
### Fixed
- 10.6.1: Fix Baileywiki previews (often empty)
### Added
- Marketplace integration (available assets)

## [10.5.0] - 2022-01-28
### Fixed
- 10.5.1: Fix invalid dependencies
### Changed
- New look-and-feel general availability

## [10.4.0] - 2023-01-22
### Fixed
- Image preview height not fitting the window
### Added
- Option to overwrite existing files

## [10.3.0] - 2022-12-22
### Changed
- New interface (auto-scroll lists, breadcrumbs)
- Improved footer
### Added
- Whole word search & regex search
- Create article from map image

## [10.2.0] - 2022-11-13
### Added
- Configure sources for scenes (compatibility with The Forge)
- Improved UI for "in progress" indexing

## [10.1.2] - 2022-10-30
### Fixed
- 10.1.1: fix V10 compatibility
- 10.1.2: exception thrown on local scenes when compendium not found
### Changed
- Configure sources: manage image folders for scenes

## [10.0.4] - 2022-09-02
### Fixed
- 10.0.1: module packaging fix
- 10.0.2: folder view doesn't list subfolders systematically
- 10.0.3: V10 duplicate folders on scene import #51 (Thanks @Norskov!)
- 10.0.4: Scene preview UI doesn't open when Moulinette Browser Extension (MBE) is active
### Changed
- Compatibility with V10
- Major version based on FVTT

## [3.3.2] - 2022-08-20
### Fixed
- 3.3.3: folder view doesn't list subfolders systematically
- 3.3.2: Local scenes (indexed) are wrongly set as "showcase content"
- 3.3.1: #40 Non-host GMs can't use Moulinette for games hosted on The Forge

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
