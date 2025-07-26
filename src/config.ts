import { CARD_NAME } from './const';
import { HomeAssistant, LovelaceCardConfig } from './lib/types';

export type BatteryConfig = {
  soc_entities: string[];
  combined_soc_entity?: string;
  flow_entities?: string[];
  invert_flow?: boolean;
  combined_flow_entity?: string;
  discharge_live_entities?: string[];
  combined_discharge_live_entity?: string;
  charge_live_entities?: string[];
  combined_charge_live_entity?: string;
  capacity_ah_entities?: string[];
  voltage_entities?: string[];
  parallel_average_voltage?: boolean;
  runtime_location?: string;
  depth_of_discharge?: number;
};

export type ParallelConfig = {
  parallel_first?: boolean;
  aliases?: boolean;
};

export type RefreshConfig = {
  lux_dongles?: boolean;
  button_location?: string;
};

export type GridHueConfig = {
  hue?: boolean;
  dot?: boolean;
};

export type GridConfig = {
  flow_entities: string[];
  parallel_flow_entity?: string;
  invert_flow?: boolean;
  voltage_entities?: string[];
  indicators?: GridHueConfig;
  aliases?: boolean;
  refresh_button_location?: string;
  generator_power_entities?: string[];
  generator_voltage_entities?: string[];
  parallel_average_voltage?: boolean;
};

export type ConsumptionConfig = {
  home_entities: string[];
  combined_consumption_entity?: string;
  backup_entities?: string[];
  allocated_power_entities?: string[];
};

export type PvConfig = {
  combined_entities?: string[];
  combined_parallel_entity?: string;
  array_1_entities?: string[];
  array_2_entities?: string[];
  array_3_entities?: string[];
};

export type UpdateTimeConfig = {
  entities?: string[];
  show_datetime?: boolean;
  show_time_since?: boolean;
  has_timestamp_attribute?: boolean;
};

export type StatusCodesConfig = {
  entities?: string[];
  include_status_title: false;
  overwrite_as_normal?: number[];
  overwrite_as_warning?: number[];
  overwrite_as_error?: number[];
};

export type TempConfig = {
  entities?: string[];
};

export type LuxCardConfig = LovelaceCardConfig & {
  inverter_count: number;
  battery: BatteryConfig;
  parallel?: ParallelConfig;
  refresh?: RefreshConfig;
  grid: GridConfig;
  consumption: ConsumptionConfig;
  pv?: PvConfig;
  temp?: TempConfig;
  update_time?: UpdateTimeConfig;
  status_codes?: StatusCodesConfig;
  title?: string;
};

function validateEntityCount(object_list: string[], object_name: string, inv_count: number) {
  if (object_list.length != inv_count) throw new Error(`'${object_name}' list must be equal to the 'inverter_count'.`);
}

export function validateConfig(config: LuxCardConfig) {
  // Inverter count
  if (config.inverter_count < 1) throw new Error(`'inverter_count' must be positive value.`);

  // Battery
  if (!config.battery) throw new Error(`'battery' is a required object.`);

  // Battery SOC
  if (!config.battery.soc_entities) throw new Error(`'battery_soc' is a required list within 'battery'.`);
  validateEntityCount(config.battery.soc_entities, 'battery.soc_entities', config.inverter_count);

  // Battery Flow
  if (
    !(config.battery.flow_entities || (config.battery.charge_live_entities && config.battery.discharge_live_entities))
  )
    throw new Error(`Battery flow is required. Instruction in the README explains battery flow.`);
  if (config.battery.flow_entities)
    validateEntityCount(config.battery.flow_entities, 'battery.flow_entities', config.inverter_count);
  if (config.battery.charge_live_entities)
    validateEntityCount(config.battery.charge_live_entities, 'battery.charge_live_entities', config.inverter_count);
  if (config.battery.discharge_live_entities)
    validateEntityCount(
      config.battery.discharge_live_entities,
      'battery.discharge_live_entities',
      config.inverter_count
    );

  // Consumption
  if (!config.consumption) throw new Error(`'consumption' is a required object.`);
  if (!config.consumption.home_entities) throw new Error(`'home_entities' is a required list within 'consumption'.`);
  validateEntityCount(config.consumption.home_entities, 'consumption.home_entities', config.inverter_count);

  // Grid
  if (!config.grid) throw new Error(`'grid' is a required object.`);
  if (!config.grid.flow_entities) throw new Error(`'flow_entities' is a required list within 'grid'.`);
  validateEntityCount(config.grid.flow_entities, 'grid.flow_entities', config.inverter_count);
}
