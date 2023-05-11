# LuxPower Distribution Card

A simple power distribution card of an inverter and battery system, for Home Assistant. The card is modeled after LuxpowerTek's app and website.

![Lux power distribution card](images/power-flow-card-1.png "Lux power distribution card")

## Installation

### HACS

This card is not yet published on HACS, so you will need to install it manually.

### Manual install

1. Download `lux-power-distribution-card.js` from the [latest release](https://github.com/DanteWinters/lux-power-distribution-card/releases/latest) and copy it into your `config/www` directory.

2. Add the resource reference as decribed below.

### CLI install

1. Navigate into your `config/www` directory on Home Assistant.

2. Download `lux-power-distribution-card.js` with the following command:

  ```cli
  $ wget https://github.com/DanteWinters/lux-power-distribution-card/releases/download/v0.2.0/lux-power-distribution-card.js
  ```

3. Add the resource reference as decribed below.

### Add resource reference

Visit the Resources page in your Home Assistant install and add `lux-power-distribution-card.js` as a JavaScript Module.
 [![Open your Home Assistant instance and show your dashboard resources.](https://my.home-assistant.io/badges/lovelace_resources.svg)](https://my.home-assistant.io/redirect/lovelace_resources/)

## Adding the card to the dashboard

### Configuration
The following is a list of entities for the card:

| Name | Required | Description |
|---|:---:|---|
| battery_soc| yes | Battery state of charge |
| battery_flow| yes | Power flowing from and to the battery. Negative flow is discharge, and positive flow is charge. |
| home_consumption| yes | Output power of the inverter to your home. |
| grid_flow| yes | Power flowing to and from grid. Negative flow is is import from grid, and positive flow is export to grid. |
| battery_voltage | no | Battery's voltage. |
| pv_power | no | Solar power. |
| backup_power | no | This is off-grid power. In the case of the LuxpowerTek inverter, this is used when grid is not available. |
| grid_voltage | no | Grid's voltage. |
| energy_allocations | no | This is not a single entity, but a list of entities. Explaination below. |

If you have the Luxpower integration, you can use the following code directly (except for the energy_allocations):
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
energy_allocations:
  entities:
    - sensor.power_plug_1
    - sensor.power_plug_2
    - sensor.power_plug_3
    - sensor.power_plug_4
```

## LuxpowerTek integration

The LuxpowerTek integration is hosted in a private repository by 
[Guy Wells](https://github.com/guybw)

## Energy Allocations Entities

The *energy_allocations* entities can be any entity that measures power. It will sum the values together and display on the card. The idea is to use this to track how much of the home's power usage is know.

## Additional illistrations

![Lux power distribution card](images/power-flow-card-2.png "Lux power distribution card")
![Lux power distribution card](images/power-flow-card-3.png "Lux power distribution card")
![Lux power distribution card](images/power-flow-card-4.png "Lux power distribution card")