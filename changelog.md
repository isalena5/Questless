# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/) after v0.1.

## [0.1] Pre-Alfa - 2026-03-01 - Branch v0.1
### Added
- Added a changelod.md file for better/more organized documentation
- Game selection page (will now become the main page)
- Toggle functionality to hide/expand task's subtasks and the task's subtasks' subtasks

### Changed
- Game (the tasks page) is no longer the main page of the app
    - Tasks are now accessed by selecting a game in the selection page
- Improved the UI with the design made in the first design sprint
    - Most of the update has been to support the new UI with the already stablished functionalities

### Fixed
- Separated script.js into multiple files using the separation of concerns as a guidance, since it was getting difficult to scale and refactor
    - It now lives as:
        - icons, logic, main, models, render, state, storage & events[.games & .tasks] .js
    - Divided events into 2 files, since it was not possible to operate both pages (homepage and game) while in the same file


## [0.0.3] - 2026-03-01 - Branch v0.0 -- Pushed to main
### Added
- Subtasks:
    - There are subtasks now
    - When task is completed all subtasks are automatically checked off, and viceversa
- Added comments, still missing most (not anymore)
- There is time metadata now, I will use it when the time is right

## [0.0.2] - 2026-02-20 - Branch v0.0
### Added
- Added more comments to the script.js code (still more to add, but I'm making progress)

- Added 'Enter' keyboard shorcut to add tasks (life is beautiful now)

- Tasks are now classes instead with unique IDs, titles and a completed state
    - This will make adding nested tasks and embedding other information in tasks easier, when it's time to add them

### Changed
- Overhauled storage method to use JSON files instead of saving as HTML with its UI embbeded

## [0.0.1] - 2026-01-06 - Branch v0.0 -- Pushed to main
### Added
- Added 'HeroIcons' (The 'X' button)

### Fixed
- The 'X' button is no longer lost. Fixed broken code preventing for the 'X' to be displayed.

## [0.0.0] - 2026-01-04 - Branch v0.0
### Added
- Changed the custom CSS to use the TailwindCSS & DaisyUI libraries
      - Installed DaisyUI 5.5.14
      - Installed TailwindCSS v4.1.18
- Added some comments to explain parts of the code (Some are missing and more coming soon)
- Added a "Reset" button to clear all tasks

### Changed
- Website now reads the styles from public/output.css instead

### Fixed
- Deleted the previous placeholder images files (Checkbox, etc)
    - Replaced with DaisyUI items and HeroUI icons

### Deprecated
- Deleted all custom CSS except for the background's gradient which is now surface

## First release - 2025-12-30
### Added
- Initial release of the project