import { CARD_NAME } from './const';
import { HomeAssistant, LovelaceCardConfig } from './lib/types';

export type BatteryConfig = {
  soc_entities: string[];
  combined_soc_entity?: string;
  flow_entities?: string[];
  invert_flow?: boolean;
  discharge_live_entities?: string[];
  combined_discharge_live_entity?: string;
  charge_live_entities?: string[];
  combined_charge_live_entity?: string;
  capacity_ah_entities?: string[];
  voltage_entities?: string[];
  parallel_average_voltage?: boolean;
  voltage_decimal?: boolean; // show the voltage with 1 decimal
  runtime_location?: string;
  depth_of_discharge?: number;
  charge_target_soc?: number;
  parallel_flow_entity?: string;
  parallel_soc_entity?: string;
  show_parallel_soc_entity?: boolean | string;
  // One battery bank shared by all inverters: its SOC, voltage and capacity are read from
  // the inverter at shared_index (default 0), and the runtime uses the combined flow.
  shared?: boolean;
  shared_index?: number;
};

export type ParallelConfig = {
  parallel_first?: boolean;
  aliases?: string[];
};

export type RefreshAction = { action: string; [key: string]: any };

export type RefreshConfig = {
  lux_dongles?: string[];
  // Standard HA actions (perform-action, navigate, url, ...) run by the refresh button instead of
  // the LuxPower refresh service. `action` is for the Parallel view (and any inverter without its
  // own), `inverter_actions` has one per inverter. Configs with only lux_dongles work as before.
  action?: RefreshAction;
  inverter_actions?: RefreshAction[];
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
  generator_power_entities?: string[];
  generator_voltage_entities?: string[];
  parallel_average_voltage?: boolean;
  voltage_decimal?: boolean; // show grid and generator voltage with 1 decimal
};

export type ConsumptionConfig = {
  home_entities: string[];
  combined_consumption_entity?: string;
  backup_entities?: string[];
  allocated_power_entity?: string;
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

/**
 * A required entity hasn't been chosen yet, e.g. while setting the card up in the UI editor.
 * The card shows this as a "finish the setup" hint instead of a configuration error.
 */
export class IncompleteConfigError extends Error {
  // Checked by name: the build's Babel step can break `instanceof` for subclasses of Error.
  name = 'IncompleteConfigError';
}

export const isIncomplete = (err: unknown): boolean => (err as Error)?.name === 'IncompleteConfigError';

const ENTITY_NAMES: Record<string, string> = {
  'battery.soc_entities': 'battery SOC',
  'battery.flow_entities': 'battery flow',
  'battery.charge_live_entities': 'battery charge',
  'battery.discharge_live_entities': 'battery discharge',
  'consumption.home_entities': 'home consumption',
  'grid.flow_entities': 'grid flow',
};

function incomplete(object_name: string, inverter: number, inv_count: number): IncompleteConfigError {
  const which = inv_count > 1 ? ` for inverter ${inverter}` : '';
  return new IncompleteConfigError(
    `Choose the ${ENTITY_NAMES[object_name] ?? object_name} entity${which} ('${object_name}').`,
  );
}

function validateEntityCount(object_list: string[], object_name: string, inv_count: number) {
  // Too few entries or a blank one: not chosen yet. An empty entry would crash rendering otherwise.
  const missing = Array.from({ length: inv_count }, (_, i) => object_list[i]).findIndex((entity) => !entity);
  if (missing != -1) throw incomplete(object_name, missing + 1, inv_count);
  if (object_list.length != inv_count) throw new Error(`'${object_name}' list must be equal to the 'inverter_count'.`);
}

export function validateConfig(config: LuxCardConfig) {
  // Inverter count
  if (!Number.isInteger(config.inverter_count) || config.inverter_count < 1)
    throw new Error(`'inverter_count' must be a whole number of 1 or more.`);

  // Battery
  if (!config.battery) throw new Error(`'battery' is a required object.`);

  // Battery SOC
  if (!config.battery.soc_entities) throw incomplete('battery.soc_entities', 1, config.inverter_count);
  validateEntityCount(config.battery.soc_entities, 'battery.soc_entities', config.inverter_count);

  // Battery Flow
  if (!(
    config.battery.flow_entities ||
    (config.battery.charge_live_entities && config.battery.discharge_live_entities)
  ))
    throw incomplete('battery.flow_entities', 1, config.inverter_count);
  if (config.battery.flow_entities)
    validateEntityCount(config.battery.flow_entities, 'battery.flow_entities', config.inverter_count);
  if (config.battery.charge_live_entities)
    validateEntityCount(config.battery.charge_live_entities, 'battery.charge_live_entities', config.inverter_count);
  if (config.battery.discharge_live_entities)
    validateEntityCount(
      config.battery.discharge_live_entities,
      'battery.discharge_live_entities',
      config.inverter_count,
    );

  // Charge target. Up to 150, since some inverters use e.g. 101% for top balancing; the charge
  // time is then calculated up to that value.
  if (config.battery.charge_target_soc !== undefined) {
    const target = config.battery.charge_target_soc;
    if (typeof target !== 'number' || target <= 0 || target > 150)
      throw new Error(`'battery.charge_target_soc' must be a number from 1 to 150.`);
  }

  // Refresh actions
  const isAction = (value: unknown) => typeof (value as RefreshAction)?.action === 'string';
  if (config.refresh?.action !== undefined && !isAction(config.refresh.action))
    throw new Error(`'refresh.action' must be an action, e.g. 'action: perform-action'.`);
  if (config.refresh?.inverter_actions !== undefined) {
    const list = config.refresh.inverter_actions;
    if (!Array.isArray(list) || list.length != config.inverter_count)
      throw new Error(`'refresh.inverter_actions' list must be equal to the 'inverter_count'.`);
    const bad = list.findIndex((item) => !isAction(item));
    if (bad != -1)
      throw new Error(
        `'refresh.inverter_actions' entry ${bad + 1} must be an action (use 'action: none' to skip one).`,
      );
  }

  // Shared battery
  if (config.battery.shared_index !== undefined) {
    const index = config.battery.shared_index;
    if (!Number.isInteger(index) || index < 0 || index >= config.inverter_count)
      throw new Error(`'battery.shared_index' must be a whole number from 0 to ${config.inverter_count - 1}.`);
  }

  // Consumption
  if (!config.consumption) throw new Error(`'consumption' is a required object.`);
  if (!config.consumption.home_entities) throw incomplete('consumption.home_entities', 1, config.inverter_count);
  validateEntityCount(config.consumption.home_entities, 'consumption.home_entities', config.inverter_count);

  // Grid
  if (!config.grid) throw new Error(`'grid' is a required object.`);
  if (!config.grid.flow_entities) throw incomplete('grid.flow_entities', 1, config.inverter_count);
  validateEntityCount(config.grid.flow_entities, 'grid.flow_entities', config.inverter_count);
}

//////////////////////////////
// Warnings
//////////////////////////////

// Options the card reads, per section. Anything else is a typo or an old option and gets a warning.
const KNOWN_OPTIONS: Record<string, string[]> = {
  '': [
    'type',
    'title',
    'inverter_count',
    'battery',
    'parallel',
    'refresh',
    'grid',
    'consumption',
    'pv',
    'temp',
    'update_time',
    'status_codes',
    // Options Home Assistant (or popular add-ons) put on every card.
    'view_layout',
    'layout_options',
    'grid_options',
    'visibility',
    'card_mod',
    'index',
    'view_index',
  ],
  battery: [
    'soc_entities',
    'flow_entities',
    'invert_flow',
    'charge_live_entities',
    'discharge_live_entities',
    'capacity_ah_entities',
    'voltage_entities',
    'parallel_average_voltage',
    'voltage_decimal',
    'runtime_location',
    'depth_of_discharge',
    'charge_target_soc',
    'parallel_flow_entity',
    'parallel_soc_entity',
    'show_parallel_soc_entity',
    'shared',
    'shared_index',
  ],
  parallel: ['parallel_first', 'aliases'],
  refresh: ['lux_dongles', 'action', 'inverter_actions', 'button_location'],
  grid: [
    'flow_entities',
    'parallel_flow_entity',
    'invert_flow',
    'voltage_entities',
    'indicators',
    'generator_power_entities',
    'generator_voltage_entities',
    'parallel_average_voltage',
    'voltage_decimal',
  ],
  'grid.indicators': ['hue', 'dot'],
  consumption: ['home_entities', 'combined_consumption_entity', 'backup_entities', 'allocated_power_entity'],
  pv: ['combined_entities', 'combined_parallel_entity', 'array_1_entities', 'array_2_entities', 'array_3_entities'],
  temp: ['entities'],
  update_time: ['entities', 'show_datetime', 'show_time_since', 'has_timestamp_attribute'],
  status_codes: ['entities', 'overwrite_as_normal', 'overwrite_as_warning', 'overwrite_as_error'],
};

// Options that were documented but never read by the card, and what to use instead.
const REPLACED_OPTIONS: Record<string, string> = {
  'battery.combined_soc_entity': "'battery.parallel_soc_entity'",
  'battery.combined_flow_entity': "'battery.parallel_flow_entity'",
  'battery.combined_charge_live_entity': "'battery.parallel_flow_entity' (used for the parallel history graph)",
  'battery.combined_discharge_live_entity': "'battery.parallel_flow_entity' (used for the parallel history graph)",
  'consumption.allocated_power_entities': "'consumption.allocated_power_entity' with a Sum helper (see the README)",
};

// Optional lists with one entry per inverter; required lists are checked by validateConfig.
const PER_INVERTER_LISTS = [
  'battery.capacity_ah_entities',
  'battery.voltage_entities',
  'grid.voltage_entities',
  'grid.generator_power_entities',
  'grid.generator_voltage_entities',
  'consumption.backup_entities',
  'pv.combined_entities',
  'pv.array_1_entities',
  'pv.array_2_entities',
  'pv.array_3_entities',
  'temp.entities',
  'update_time.entities',
  'status_codes.entities',
  'parallel.aliases',
  'refresh.lux_dongles',
];

function valueAt(config: LuxCardConfig, path: string): unknown {
  return path.split('.').reduce<any>((value, key) => (value == null ? undefined : value[key]), config);
}

/**
 * Problems that don't stop the card from showing, but make it show something wrong or ignore an option.
 * They never reject a config, so cards that worked before keep working.
 */
export function collectWarnings(config: LuxCardConfig): string[] {
  const warnings: string[] = [];
  const count = config.inverter_count;

  // Unknown and replaced options.
  for (const [section, known] of Object.entries(KNOWN_OPTIONS)) {
    const value = section ? valueAt(config, section) : config;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    for (const key of Object.keys(value)) {
      if (known.includes(key)) continue;
      const path = section ? `${section}.${key}` : key;
      const replacement = REPLACED_OPTIONS[path];
      warnings.push(
        replacement
          ? `'${path}' isn't used by the card; use ${replacement} instead.`
          : `'${path}' isn't an option of this card and is ignored (typo?).`,
      );
    }
  }

  // Per-inverter lists with the wrong number of entries.
  for (const path of PER_INVERTER_LISTS) {
    const list = valueAt(config, path);
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      warnings.push(`'${path}' should be a list with one entry per inverter.`);
      continue;
    }
    const blank = Array.from({ length: count }, (_, i) => list[i]).findIndex(
      (entry) => entry === undefined || entry === '',
    );
    if (blank != -1) {
      warnings.push(`'${path}' has no entry for inverter ${blank + 1}, so it shows 0 or nothing there.`);
    } else if (list.length > count) {
      warnings.push(`'${path}' has ${list.length} entries for ${count} inverter(s); the extra ones are ignored.`);
    }
  }

  // Values the card doesn't understand.
  const oneOf = (path: string, allowed: string[]) => {
    const value = valueAt(config, path);
    if (value !== undefined && !allowed.includes(value as string))
      warnings.push(`'${path}' should be one of ${allowed.join(', ')}; '${value}' is ignored.`);
  };
  oneOf('battery.runtime_location', ['left', 'bottom', 'both']);
  oneOf('refresh.button_location', ['left', 'right', 'both', 'none']);
  // A refresh button that has nothing to do.
  const refresh = config.refresh;
  const hasAction = (action?: RefreshAction) => !!action && action.action !== 'none';
  if (
    refresh?.button_location &&
    refresh.button_location !== 'none' &&
    !refresh.lux_dongles?.length &&
    !hasAction(refresh.action) &&
    !(refresh.inverter_actions ?? []).some(hasAction)
  )
    warnings.push(`The refresh button has nothing to do: add 'refresh.lux_dongles' (LuxPower) or a 'refresh.action'.`);

  const dod = config.battery?.depth_of_discharge;
  if (dod !== undefined && (typeof dod !== 'number' || dod < 0 || dod >= 100))
    warnings.push(`'battery.depth_of_discharge' should be a number from 0 to 99.`);
  for (const key of ['overwrite_as_normal', 'overwrite_as_warning', 'overwrite_as_error'] as const) {
    const codes = config.status_codes?.[key];
    if (codes !== undefined && !(Array.isArray(codes) && codes.every((code) => typeof code === 'number')))
      warnings.push(`'status_codes.${key}' should be a list of numbers (status codes).`);
  }
  return warnings;
}
