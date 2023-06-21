# LuxPower Distribution Card

<!-- [![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg?style=flat-square)](https://github.com/hacs/integration) -->
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/DanteWinters/lux-power-distribution-card?style=flat-square)
![Github stars](https://img.shields.io/github/stars/DanteWinters/lux-power-distribution-card?style=flat-square)
![Github issues](https://img.shields.io/github/issues/DanteWinters/lux-power-distribution-card?style=flat-square)

A simple power distribution card of an inverter and battery system, for [Home Assistant](https://home-assistant.io/). The card is modelled after LuxpowerTek's app and website.

<img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/full-card-allocated-power.png" width="450" />

## Installation

### HACS

There is a PR to add this card to the HACS defaults, but for now this card can be added by adding the URL as a custom repository source in HACS:
```
DanteWinters/lux-power-distribution-card
```

### Manual install

1. Download `lux-power-distribution-card.js` from the [latest release](https://github.com/DanteWinters/lux-power-distribution-card/releases/latest) and copy it into your `config/www` directory.

2. Add the resource reference as described below.

### Add resource reference

Visit the Resources page in your Home Assistant install and add `lux-power-distribution-card.js` as a JavaScript Module.
 [![Open your Home Assistant instance and show your dashboard resources.](https://my.home-assistant.io/badges/lovelace_resources.svg)](https://my.home-assistant.io/redirect/lovelace_resources/)

## Adding the card to the dashboard

### Configuration
The following is a list of configs for the card:

**NOTE:** All entities must be added as an entity underneath the config. Refer to the example code below on how this looks.

**Required configurations:**
| Name | Type | Description |
|---|:---:|---|
| battery_soc | entity | Battery state of charge |
| battery_flow | entity | Power flowing from and to the battery. Negative flow is discharge, and positive flow is charge. |
| home_consumption | entity | Output power of the inverter to your home. |
| grid_flow | entity | Power flowing to and from grid. Negative flow is import from grid, and positive flow is export to grid. |

**Optional configurations:**
| Name | Type | Description |
|---|:---:|---|
| battery_voltage | entity | Battery's voltage. |
| pv_power | entity | Solar power. |
| backup_power | entity | This is off-grid power. In the case of the LuxpowerTek inverter, this is used when grid is not available. |
| grid_voltage | entity | Grid's voltage. |
| energy_allocations | list of entities | This is not a single entity, but a list of entities. Explanation below. |
| update_time | entity | An entity for the last time the values were updated. |
| update_time_timestamp_attribute | boolean | if the update time entity has atimestamp attribute, it can be used to show how long since the last update. |
| grid_indicator_hue | boolean | If this is set to true and the grid voltage drops to 0, the grid image will become dimmer. (Requires a grid voltage entity.) |
| grid_indicator_dot | boolean | If this is set to true and the grid voltage drops to 0, a red indicator will be added next to the grid voltage text. (Requires a grid voltage entity.)|
| use_lux_status_codes | entity | This is used with the *lux_fail_status_codes* list. If the status code is in the given list, a warning will show on the top right card to indicate something is wrong.  |
| lux_fail_status_codes | integer list | List of failure codes that will show a warning at the top right of the card. |
| lux_dongle | string | This is the LuxPower inverter's dongle number. It will later on be used to call the refresh service. (This requires the LuxPowerTek integration that supports this.)

If you have the Luxpower integration, you can use the following code directly (except for the energy_allocations, and change the dongle number):
 ```yaml
type: custom:lux-power-distribution-card
battery_soc:
  entity: sensor.lux_battery
battery_flow:
  entity: sensor.lux_battery_flow_live
home_consumption:
  entity: sensor.lux_home_consumption_live
grid_flow:
  entity: sensor.lux_grid_flow_live
battery_voltage:
  entity: sensor.lux_battery_voltage_live
pv_power:
  entity: sensor.lux_solar_output_live
backup_power:
  entity: sensor.lux_power_to_eps_live
grid_voltage:
  entity: sensor.lux_grid_voltage_live
update_time:
  entity: sensor.lux_data_received_time
update_time_timestamp_attribute: true
grid_indicator_hue: true
use_lux_status_codes: true
lux_status_code:
  entity: sensor.lux_status
lux_fail_status_codes:
  - 64
  - 16
lux_dongle: BA00000000
energy_allocations:
  entities:
    - sensor.power_plug_1
    - sensor.power_plug_2
    - sensor.power_plug_3
    - sensor.power_plug_4
```

## LuxpowerTek integration

The LuxpowerTek integration is hosted in a private repository by [Guy Wells](https://github.com/guybw)

### Status codes

The status codes are up to the user for what they want to see the warning for.

Currently there are 2 options that will be displayed:
 - *Status: Normal 🟢*
 - *Status: Warning 🔴*

At some point in time, the warning message may be updated and be based on the status represented by the code.

### Refresh and the Dongle serial number

This refresh only works for the LuxPowerTek integration referenced above. The service name and function call format are hard-coded.

**NOTE:** *Although the refresh button is displayed, it does not refresh the registers.*

## Energy Allocations Entities

The *energy_allocations* entities can be any entity that measures power. It will sum the values together and display on the card. The idea is to use this to track how much of the home's power usage is known.

## Grid indicators

Below are 2 pictures of the grid image. The first is the grid in a normal state, and the second is the grid image with both indicators active.

| Normal Grid | No Grid Input |
|---|---|
| <img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/grid-normal.png" /> | <img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/grid-no-ac.png" /> |

## Gallery

| The card with only required entities | The card with all required and optional entities | The card using all the LuxPower integration options and entities |
|---|---|---|
| <img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/base-card.png" /> | <img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/base-card-with-extras.png" /> | <img src="https://raw.githubusercontent.com/DanteWinters/lux-power-distribution-card/main/docs/images/full-card.png" /> |
