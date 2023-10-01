# LuxPower Distribution Card

<!-- [![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg?style=flat-square)](https://github.com/hacs/integration) -->
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/DanteWinters/lux-power-distribution-card?style=flat-square)
![Github stars](https://img.shields.io/github/stars/DanteWinters/lux-power-distribution-card?style=flat-square)
![Github issues](https://img.shields.io/github/issues/DanteWinters/lux-power-distribution-card?style=flat-square)

A simple power distribution card of an inverter and battery system, for [Home Assistant](https://home-assistant.io/). The card is modelled after LuxpowerTek's app and website.

<img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/full-card-allocated-power.png" width="450" />

# Installation

## HACS

There is a PR to add this card to the HACS defaults, but for now this card can be added by adding the URL as a custom repository source in HACS:
```
DanteWinters/lux-power-distribution-card
```

## Manual install

1. Download  the four JavaScript files (`lux-power-distribution-card.js`, `config-entity-functions.js`, `html-functions.js` and `constants.js`) from the [latest release](https://github.com/DanteWinters/lux-power-distribution-card/releases/latest) and copy it into your `config/www` directory.

2. Add the resource reference:
   1. Visit the Resources page in your Home Assistant instance [![Open your Home Assistant instance and show your dashboard resources.](https://my.home-assistant.io/badges/lovelace_resources.svg)](https://my.home-assistant.io/redirect/lovelace_resources/)
   2. Add `lux-power-distribution-card.js` as a JavaScript Module.


# Adding the card to the dashboard

## Configuration
The following is a list of configs for the card:

**NOTE:** Please refer to the example config below for clarification on how the entities should be added.

### Required configurations

| Name | Type | Description |
|---|:---:|---|
| inverter_count | number | The number of inverters used in the system. Must be a positive integer that is 1 or higher. |
| battery_soc | entities | Battery state of charge. |
| battery_flow | entities | Power flowing from and to the battery. Negative flow is discharge, and positive flow is charge. |
| home_consumption | entities | Output power of the inverter to your home. |
| grid_flow | entities | Power flowing to and from grid. Negative flow is import from grid, and positive flow is export to grid. |

### Optional configurations

| Name | Type | Description |
|---|---|---|
| battery_voltage | entities | Battery's voltage. |
| pv_power | entities | Solar power. |
| backup_power | entities | This is off-grid power. In the case of the LuxpowerTek inverter, this is used when grid is not available. |
| grid_voltage | entities | Grid's voltage. |
| energy_allocations | entities | This is not a single entity, but a list of entities. Explanation below. |
| update_time | entities | An entity for the last time the values were updated. |
| status_codes | entities | An entity that has the inverter status. This is directly used with the LuxpowerTek integration (See below).  |
| lux_dongle | list of strings | This is the LuxPower inverter's dongle number. It will later on be used to call the refresh service. (This requires the LuxPowerTek integration that supports this.) This or the inverter alias list are required if there are more than 1 inverter. |
| inverter_alias | list of strings | This is used when there is more than 1 inverter. This will be the names used in the dropdown list. This or the lux dongle list is required. |
| refresh_button | string | The location of the refresh button. Can be 'left', 'right' or 'both'. See below for more information. **NOTE:** the refresh button will only show if the *lux_dongle* is added. |

### Sub-configs that are not a list of entities or values

| Parent | Name | Type | Description |
|---|---|---|---|
| grid_indicator | hue | bool | If this is set to true and the grid voltage drops to 0, the grid image will become dimmer. (Requires a grid voltage entity.) |
| grid_indicator | dot | bool | If this is set to true and the grid voltage drops to 0, a red indicator will be added next to the grid voltage text. (Requires a grid voltage entity.) |
| update_time | show_last_update | bool | If the update time entity has a timestamp attribute, it can be used to show how long since the last update. |
| status_codes | no_grid_is_warning | bool | Some status codes (64, 136 and 192) are shown when grid is not available. If this value is true, these codes will show up as a warning on the status. If the value is false, these values will show up as normal. |
| parallel | average_voltage | bool | When using multiple inverters, there is a default created item on the list of inverters called "Parallel" that averages all the values from the different inverters. If *average_voltage* is true, the battery and grid voltages will be averaged and shown on the Parallel setting. Otherwise it will not show the voltages there. |
| parallel | parallel_first | bool | When using multiple inverters, there is a default created item on the list of inverters called "Parallel" that averages all the values from the different inverters. If *parallel_first* is true, the "Parallel" option will be shown first of the list, otherwise it will be last. |

# LuxpowerTek integration

The LuxpowerTek integration is hosted in a private repository by [Guy Wells](https://github.com/guybw)

## Configuration

If you have the Luxpower integration, you can use the following code directly (except for the energy_allocations, and change the dongle number):

 ```yaml
type: custom:lux-power-distribution-card
inverter_count: 1
parallel:
  average_voltage: true
  parallel_first: true
battery_soc:
  entities:
    - sensor.lux_battery
battery_flow:
  entities:
    - sensor.lux_battery_flow_live
home_consumption:
  entities:
    - sensor.lux_home_consumption_live
grid_flow:
  entities:
    - sensor.lux_grid_flow_live
lux_dongle:
  - BAxxxxxxxx
inverter_alias:
  - Inverter 1
battery_voltage:
  entities:
    - sensor.lux_battery_voltage_live
pv_power:
  entities:
    - sensor.lux_solar_output_live
backup_power:
  entities:
    - sensor.lux_power_to_eps_live
grid_voltage:
  entities:
    - sensor.lux_grid_voltage_live
update_time:
  entities:
    - sensor.lux_data_received_time
  show_last_update: true
grid_indicator:
  hue: true
status_codes:
  entities:
    - sensor.lux_status
  no_grid_is_warning: true
refresh_button: right
energy_allocations:
  entities:
    - sensor.power_plug_1
    - sensor.power_plug_2
    - sensor.power_plug_3
    - sensor.power_plug_4
```

## Refresh and the Dongle serial number

This refresh only works for the LuxPowerTek integration referenced above. The service name and function call format are hard-coded.

The location of the refresh button can be set with the *refresh_button_location* config value. There are 4 accepted values for this config:

- left (Displayed on the left hand side, below the battery text.)
- right (Displayed on the right hand side, above the grid image.)
- both (Displayed on both sides, as described on the above two points.)
- none (Removes the refresh button.)

# Energy Allocations Entities

The *energy_allocations* entities can be any entity that measures power. It will sum the values together and display on the card. The idea is to use this to track how much of the home's power usage is known.

# Grid indicators

Below are 2 pictures of the grid image. The first is the grid in a normal state, and the second is the grid image with both indicators active.

| Normal Grid | No Grid Input |
|---|---|
| <img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/grid-normal.png" /> | <img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/grid-no-ac.png" /> |

# Gallery

| The card with only required entities | The card with all required and optional entities | The card using all the LuxPower integration options and entities |
|---|---|---|
| <img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/base-card.png" /> | <img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/base-card-with-extras.png" /> | <img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/full-card.png" /> |

# Interactive Card

The four entity images on the card can be clicked to display the history of the connected entity.

- Solar Image: Solar power entity's history.
- Battery Image: Battery SOC entity's history.
- Home Image: Home consumption entity's history.
- Grid Image: Grid flow entity's history.

# Parallel inverters

With v1.0.0, support for parallel inverters have arrived! In order to use parallel inverters, simply indicate the number of inverters you are using in the config, and add the additional inverter's entities under their corresponding headers. Take note of the *inverter_alias* and *lux_dongle* config values when using parallel inverters.

### Known issues
 - The status that is shown is for the first inverter. The next update will hopefully 

# Developer's note

Although the card is functional and even has a few nice features, the development of it was done with a lot of inexperience. From my side, I do not have JavaScript or HTML experience other than this card. For this reason, there may be many ways I implemented things that aren't optimal or safe. If you are knowledgeable in and willing to look through the code, and advice and help will be much appreciated.

In addition, I currently only have 1 inverter. So the tests for the parallel inverters were done purely in a testing environment and may have some bugs.