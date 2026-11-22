## Changelog

### 2.1.0

Features

- UI card editor (#89).
- The card picker ("Add card") shows an example of the card.
- `battery.shared` / `battery.shared_index` for parallel inverters sharing one battery bank (#101).
- `battery.charge_target_soc` to set the target of the charging time, instead of a fixed 90% (#103). Values up to 150% are accepted, e.g. 101% for inverters that top balance.
- `battery.voltage_decimal` and `grid.voltage_decimal` to show voltages with 1 decimal.
- Every option can be set in the UI editor, in collapsible sections (less common options under "advanced" areas).
- Warnings, on the card and in the editor, for options the card would ignore or show wrongly: typos and old option names, per-inverter lists with too few or too many entries, invalid values, and update entities without a `timestamp` attribute.
- While required entities aren't chosen yet (e.g. setting the card up in the UI editor), the card shows what is still needed instead of a configuration error.
- `refresh.action` and `refresh.inverter_actions` to run any Home Assistant action from the refresh button, e.g. another integration's refresh button, for all inverters or per inverter (#104). Existing `lux_dongles` configs are unchanged.

Bugfixes

- Battery runtime counted a shared battery once per inverter and used only one inverter's flow (#101).
- Missing entities are listed in a warning on the card instead of crashing it; missing or unavailable values read as 0 (#34).
- Multi-inverter cards always get the inverter selector; inverters without a name show their dongle serial or "Inverter N" (before, cards without `aliases` had no selector, and dongle serials alone gave only "Parallel").
- Values are rounded instead of cut off (52.9 V shows as 53 V, as in HA) (#96), and power in kW/MW is converted to W (#10).
- Unavailable SOC or voltage shows as "–" instead of 0: no empty battery, negative runtime or false "no grid" indicator.
- Runtime: at or below the depth of discharge it shows "Below the 20% depth of discharge" instead of a negative time, "3:07" instead of "3:7", and never "2h, 60m".
- "Updated … ago" counts in hours and days, not only minutes.
- Warnings for a refresh button with nothing to call; `inverter_count` must be a whole number.
- History graphs open on click after the card was first set up in the UI editor.
- The card only re-draws when one of its entities changes (it re-drew every 0.5 s).
- Generator fields are marked experimental in the UI editor (#66).
- Parallel view averages the generator voltage instead of adding it up (same fix as the grid voltage in #92).
- Docs: the battery's `combined_*` options were never used by the card; documented `parallel_flow_entity`, `parallel_soc_entity` and `show_parallel_soc_entity` instead.
- Docs: `allocated_power_entity` takes one entity, not a list, with steps for creating a Sum helper (#102).
- Build no longer down-levels Lit, which broke rendering of lists (`_k is not defined`).

### v2.0.0

Features

- TypeScript rework.
- Individual solar-arrays option.
- Added battery runtime calculator - Thanks @eddiehavila.

Breaking changes

- Config changed. Check example configs or `README.md` to update the configuration.

New contributors

- @eddiehavila - PR #80

### v1.6.3

Bugfixes

- Changed source of LitElement that caused Issue #76 (Thanks @greytuk for the suggestion).

### v1.6.2

Bugfixes

- Show history graphs Popup Charts No Longer Accessible in v1.6.0+ #71.
- Fix issue with not using solar. Discussion Issue with card configuration: Cannot read properties of undefined (reading 'show_individual') #65.
- Fix editor not working for some things.
- Added card to list of custom integrations with stub config.

### v1.6.1
Bugfixes

- Fix `show_individual` bug.

### v1.6.0

Features

- Feature request - display inverter temps #43 - Added optional entities to show inverter temp.
- #63 - Added optional setting for reversing grid flow (Used by inverters with different values to LuxPower).
- Added card editor.

Bugfixes

- #65 discussion - Error about a missing value when not using PV.

### v1.5.1

Visuals

- Removed the identifier for the PV strings until formatting can overall be improved.

### v1.5.0

Features

- Added generator power and voltage as configurable inputs.
- Added an option to show the individual PV strings' power.
- Neither of these features are added in the docs because they are not extensively tested and I don't have as many safeties or checks in as I would like. If you are using these, please log bugs should you cross them.

### v1.4.0

Features

- Added function to show both home consumption and backup power history (when applicable).
- Show battery flow when clicking on the battery icon and battery SOC history when clicking on the SOC info.

### v1.3.0

Visuals

- Removed double border around card.
- Card padding in line with other HA cards.
- Subtext is grey compared to the values.
- Added title as optional configuration value.

Functional changes

- Code cleaned up.
- Now allows multiple instances of the card to be used on the dashboard.

### v1.2.0

Features

- Updated the status indicator to allow for parallel inverters.

### v1.1.2

Bugfixes

- Round values to max of 2 decimal places.
- Reworked code to fix issue with battery arrows not showing.
- Reverted LitElement to HTMLElement.

### v1.1.1

Bugfixes

- For parallel page, all values are added except for battery SOC and voltages.

### v1.1.0

Features

- Added mixing between parallel inverters.
- Refresh button on Parallel page will. refresh both inverters.

### v1.0.0

Features

- v1.0.0 implements parallel inverters. Adding a second inverter will allow you to choose which inverter's info you want to see. Blending the info is the next step.
- Card now uses status codes directly from the integration and gives a short description based on that.

Breaking changes

- v1.0.0 implements a new config format. This will break existing cards until the new config is implemented. Please refer to the README file for information.


### v0.4.2

Bugfixes

- Changed styles to accommodate safari browsers.

### v0.4.0

Features

- Added the functionality to see the entity history and the refresh button works.

### v0.3.0

Features

- The refresh button can be shows by adding the correct config, but unfortunately the service isn't called when pressing the button. When this issue is solved, the rest of the interactions should be simple.
- Images stored as base64. Issue can be closed when v03.0 is made the latest release.
- Keeping the README up to date is a continuous process but it is sufficient for use and HACS.
- PR for adding to HACS is pending, but the card can be added as a custom repository.
- There are now 3 ways of showing grid status. The LuxPower integration will still require fine tuning.
- Added label to show when last the values were updated and how long ago that was (if the entity has a timestamp attribute).

Bugfixes

- Improved formatting and scaling but text is not at a point where I am satisfied with.

### v0.2.2

Features

- Implemented HACS validations actions.
- Updated README for HACS requirements.
- Moved README to root folder.

Bugfixes

- Fixed arrow-animation issue
- Cropped arrow image, result is that the arrows are larger and closer together in the final card.

### v0.2.0

- Reworked the card with better practices.

### v0.1.0

- Initial Release
