# Config

## Full config

The config has a series of nested objects in the config. Below is a all the highest level objects

```yaml
type: custom:lux-power-distribution-card
inverter_count: number # required
battery: nested object # required
parallel: nested object # optional
refresh: nested object # optional
grid: nested object # required
consumption: nested object # required
pv: nested object # optional
temp: nested object # optional
update_time: nested object # optional
status_codes: nested object # optional
title: string # optional

```

### `inverter_count`

The `inverter_count` is a required config. It must be a positive integer, and it indicates the number of inverters configured.

### `title`

Adds a title to the top of the card.

### `battery`

```yaml
battery:
    soc_entities: list of entities # required
    combined_soc_entity: entity # optional
    flow_entities: list of entities # conditionally required
    invert_flow: boolean # optional
    combined_flow_entity: entity # optional
    discharge_live_entities: list of entities  # conditionally required
    combined_discharge_live_entity: entity # optional
    charge_live_entities: list of entities # conditionally required
    combined_charge_live_entity: entity # optional
    capacity_ah_entities: list of entities # optional
    voltage_entities: list of entities # optional
    parallel_average_voltage: boolean # optional
    runtime_location: string # optional
    depth_of_discharge: number # optional
    charge_target: number, entity or list of entities # optional
```

| Config | Description |
|---|---|
| `soc_entities` | List of entities of the battery state-of-charge (SoC). |
| `combined_soc_entity` | An entity that indicated the combined SoC. Used when using multiple inverters for a history graph. |
| `flow_entities` | List of entities of the battery flow. This is when charge and discharge is combined in one entity, where  positive value is charge and negative is discharge. This is required, if `discharge_live_entities` and `charge_live_entities` are not used. |
| `invert_flow` | When using the `flow_entities` to indicate battery flow, this flips charge and discharge. |
| `combined_flow_entity` | An entity that indicated the combined flow. Used when using multiple inverters for a history graph. |
| `discharge_live_entities` | List of entities of the battery discharge. This is required along with `charge_live_entities` if `flow_entities` is not used. |
| `combined_discharge_live_entity` | An entity that indicated the combined discharge. Used when using multiple inverters for a history graph. |
| `charge_live_entities` | List of entities of the battery charge. This is required along with `discharge_live_entities` if `flow_entities` is not used. |
| `combined_charge_live_entity` | An entity that indicated the combined charge. Used when using multiple inverters for a history graph. |
| `capacity_ah_entities` | List of entities of the battery capacity. Used to calculate the battery runtime remaining. |
| `voltage_entities` | List of entities of the battery voltage. |
| `parallel_average_voltage` | This is used when there are parallel inverters, it will average the voltages when _parallel_ is selected. Otherwise the voltage will not be show when _parallel_ is selected. |
| `runtime_location` | Can be `left`, `bottom`, or `both`. If `capacity_ah_entities` and `voltage_entities` are used, the remaining battery runtime will be calculated.  |
| `depth_of_discharge` | Used when the runtime is calcualted, this indicated how far the battery is set to discharge. |
| `charge_target` | Used when the runtime is calculated while charging: the SoC (%) the "remaining to charge to" estimate counts up to. A number (default 90), an entity whose state is the percentage (e.g. the inverter's charge SOC limit), or a list of entities, one per inverter (the parallel view uses the first). Values above 100 count as 100. Falls back to 90 when the value isn't numeric. |

### `parallel`

This is for when multiple inverters are configured. The card has no limit, but all entity lists must have the same numenr of items. When there are multiple inverters configured, there is a selector at the top left of the screen that can be used to select which inverter you want to show the info for. In the list, there is also an entry called **Parallel**. This will add or average all the values between te inverters.

```yaml
parallel:
    parallel_first: boolean # optional
    aliases: list of strings  # conditionally required
```

| Config | Description |
|---|---|
| `parallel_first` | Boolean. If `parallel_first` is true, the **Parallel** option in the selector will be shows first and be the default view, otherwise it will be last. |
| `aliases` | This is the aliases for the different inverters and how they will be identified on different places. This or the `lux_dongles` list in `refresh` is required. |

### `refresh`

```yaml
refresh:
    lux_dongles: list of strings # conditionally required
    button_location: string # optional
```

| Config | Description |
|---|---|
| `lux_dongles` | List of inverter serial numbers that is used for the refresh button, or as the indicators when there are multiple. This or the `aliases` in `parallel` is requried when using multiple inverters. |
| `button_location` | The location of the refresh button. Can be `left`, `right` or `both`. |

### `grid`

```yaml
grid:
    flow_entities: list of entities # required
    parallel_flow_entity: entity # optional
    invert_flow: boolean # optional
    voltage_entities: list of entities # optional
    indicators: # optional
        hue: boolean # optional
        dot: boolean # optional
    generator_power_entities: list of entities # optional
    generator_voltage_entities: list of entities # optional
    parallel_average_voltage: boolean # optional
```

| Config | Description |
|---|---|
| `flow_entities` | List of entities of the grid flow. |
| `parallel_flow_entity` | An entity that indicated the combined grid flow. Used when using multiple inverters for a history graph. |
| `invert_flow` | Flips grid flow by multiplying by `-1`. |
| `voltage_entities` | List of entities of the grid voltage. This is also used to indicate if there is no grid. |
| `indicators.hue` | If set and the grid voltage drops to 0, the grid image will become dimmer. (Requires the `voltage_entities`.) |
| `indicators.dot` | If set and the grid voltage drops to 0, a red indicator will be added next to the grid voltage text. (Requires the `voltage_entities`). |
| `generator_power_entities` | List of entities of the generator power. |
| `generator_voltage_entities` | List of entities of the generator voltage. This is also used to indicate if there is no grid. |
| `parallel_average_voltage` | This is used when there are parallel inverters, it will average the voltages when _parallel_ is selected. Otherwise the voltage will not be show when _parallel_ is selected. |

### `consumption`

```yaml
consumption:
    home_entities: list of entities # required
    combined_consumption_entity: entity # optional
    backup_entities: list of entities # optional
    allocated_power_entities: list of entities # optional
```

| Config | Description |
|---|---|
| `home_entities` | List of entities for the home consumption. |
| `combined_consumption_entity` | This is used when there are parallel inverters, it will combine the home consumption when parallel is selected. |
| `backup_entities` | List of entities for the backup consumption. This is used when there is no power to the home consumption entities and the grid voltage is 0. |
| `allocated_power_entities` | Optional list of entities. This is power entities that is allocated to devices. The power measurement of the entities are summed. |

### `pv`

```yaml
pv:
    combined_entities: list of entities # conditionally required
    combined_parallel_entity: entity # optional
    array_1_entities: list of entities # conditionally required
    array_2_entities: list of entities # optional
    array_3_entities: list of entities # optional
```

| Config | Description |
|---|---|
| `combined_entities` | List of entities of the solar power. This combined list will show one value per inverter, or  acombined value on parallel. |
| `combined_parallel_entity` | An entity that indicated the combined solar power. Used when using multiple inverters for a history graph. |
| `array_1_entities` | List of entities of the individual solar array. |
| `array_2_entities` | List of entities of the individual solar array. |
| `array_3_entities` | List of entities of the individual solar array. |

### `temp`

```yaml
temp:
    entities: list of entities # optional
```

| Config | Description |
|---|---|
| `entities` | List of entities of the temperature of the inverters. |

### `update_time`

```yaml
update_time:
    entities: list of entities # optional
    show_datetime: boolean # optional
    show_time_since: boolean # optional
    has_timestamp_attribute: boolean # optional
```

| Config | Description |
|---|---|
| `entities` | List of entities for the update times. |
| `show_datetime` | If set to true, the last updated time will show on the card. |
| `has_timestamp_attribute` | If the entities have a `timestamp` attribute, it can calculate how long ago the card updated. |
| `show_time_since` | This is only used if the entities have `timestamp` attributes. It calculated how long ago the card updated. |

### `status_codes`

```yaml
status_codes:
    entities: list of entities # optional
    overwrite_as_normal: list of numbers # optional
    overwrite_as_warning: list of numbers # optional
    overwrite_as_error: list of numbers # optional
```

| Config | Description |
|---|---|
| `entities` | 	List of entities of the status codes. |
| `overwrite_as_normal` | List of codes that will be handled as a normal level regardless of the assigned default. |
| `overwrite_as_warning` | List of codes that will be handled as a warning level regardless of the assigned default. |
| `overwrite_as_error` | List of codes that will be handled as a error level regardless of the assigned default. |

## Example configs

There are several configs that can be used directly when you are using LuxpowerTek integration.

Here are examples for [a single inverter](lux_single_no_sn.yaml) and [dual inverters](lux_dual_no_sn.yaml) that don't have the serial numbers in the entity names. The only functional update to these examples is that the `lux_dongles` needs to be updated with your inverter's serial number to use the refresh functionality.

This example of [a single inverter](lux_single_with_sn.yaml) and [dual inverters](lux_dual_with_sn.yaml) does include the serial number in the entity name. The _single_ example, and one of the _dual_ examples, has the serial number `12345678`. Do a _find-and-replace_ to update it to your inverter's serial number. The second inverter in the _dual_ example has a serial number of `98765432`. The letters at the front of the serial number needs to be updated to use the refresh functionality.