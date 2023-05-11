# LuxPower Distribution Card

- [LuxPower Distribution Card](#luxpower-distribution-card)
  - [Introduction](#introduction)
  - [Installation](#installation)
    - [Manual installation](#manual-installation)
  - [Adding the card to the dashboard](#adding-the-card-to-the-dashboard)
    - [Optional entities](#optional-entities)

## Introduction

![Lux power distribution card](images/power-flow-card-1.png "Lux power distribution card")
![Lux power distribution card](images/power-flow-card-2.png "Lux power distribution card")
![Lux power distribution card](images/power-flow-card-3.png "Lux power distribution card")
![Lux power distribution card](images/power-flow-card-4.png "Lux power distribution card")

This is a custom Lovelace card for the Home Assistant. The card aims to recreate the power distribution card shown on the LuxpowerTek app and website, with a few small changes (and hopefully at some point, some improvements).

The card is far from complete, so please bear with the development process.

## Installation

Currently, the only way to install this card is to do so manually.

### Manual installation

1. Create a new folder in the */config/www/community* folder of your Home Assistant instance with the name *lux-power-distribution-card*.
2. Copy the *lux-power-distribution-card.js* file from the repository into the newly created folder.
3. Add the following reference to your dashboard references:

    */hacsfiles/lux-power-distribution-card/lux-power-distribution-card.js*

**NOTE:** The manual installation reference works if you already have HACS installed. If you don't have it installed, you need to use a different resource.

## Adding the card to the dashboard

Use the following config directly if you have the LuxpowerTek integration:

 ```yaml
type: custom:lux-power-distribution-card
battery_soc:
  entity: sensor.battery_soc
battery_flow:
  entity: sensor.battery_flow
home_consumption:
  entity: sensor.home_consumption
grid_flow:
  entity: sensor.grid_flow
 ```

### Optional entities

The following entities can be added to the config but are not required:

```yaml
battery_voltage:
  entity: sensor.battery_voltage
pv_power:
  entity: sensor.pv_power
backup_power:
  entity: sensor.backup_power
grid_voltage:
  entity: sensor.grid_voltage
energy_allocations:
  entities:
    - sensor.power_plug_1
    - sensor.power_plug_2
    - sensor.power_plug_3
    - sensor.power_plug_4
```

The *energy_allocations* entities can be any entity that measures power. It will sum the values together and display on the card.
