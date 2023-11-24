## Changelog

### v0.1.0

- Initial Release

### v0.2.0

- Reworked the card with better practices.

### v0.2.2

Enhancements

- Implemented HACS validations actions.
- Updated README for HACS requirements.
- Moved README to root folder.

Bugfixes

- Fixed arrow-animation issus
- Cropped arrow image, final result is that the arrows are larger and closer together in the final card.

### v0.3.0

Enhancements

- The refresh button can be shows by adding the correct config, but unfortunately the service isn't called when pressing the button. When this issue is solved, the rest of the interactions should be simple
- Images stored as base64. Issue can be closed when v03.0 is made the latest release.
- Keeping the README up to date is a continuous process but it is sufficient for use and HACS.
- PR for adding to HACS is pending, but the card can be added as a custom repository.
- There are now 3 ways of showing grid status. The LuxPower integration will still require fine tuning.
- Added label to show when last the values were updated, and also how long ago that was (if the entity has a timestamp attribute)

Bugfixes

- Improved formatting and scaling but text is not at a point where I am satisfied with.

### v0.4.0

Features

- Added the functionality to see the entity history and the refresh button works.

### v0.4.2

Bugfix

- Changed styles to accommodate safari browsers.

### v1.0.0

Features

- Parallel inverters
  - v1.0.0 implements parallel inverters. Adding a second inverter will allow you to choose which inverter's info you want to see. Blending the info is the next step
- Card now uses status codes directly from the integration and gives a short description based on that.

Breaking changes

- v1.0.0 implements a new config format. This will break existing cards until the new config is implemented. Please refer to the README file for information.

### v1.1.0

Features

- Added mixing between parallel inverters
- Refresh button on Parallel page will. refresh both inverters

### v1.1.1

Bugfix

- For parallel page, all values are added except for battery SOC and voltages.

### v1.1.2

Bugfixes

- Round values to max of 2 decimal places.
- Reworked code to fix issue with battery arrows not showing.
- Reverted LitElement to HTMLElement.

### v1.2.0

Features

- Updated the status indicator to allow for parallel inverters.
