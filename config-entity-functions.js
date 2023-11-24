import * as constants from "./constants.js";

const required_entries = ["inverter_count", "battery_soc", "battery_flow", "home_consumption", "grid_flow"];

export function buildConfig(config) {
  function deepcopy(value) {
    if (!(!!value && typeof value == "object")) {
      return value;
    }
    if (Object.prototype.toString.call(value) == "[object Date]") {
      return new Date(value.getTime());
    }
    if (Array.isArray(value)) {
      return value.map(deepcopy);
    }
    const result = {};
    Object.keys(value).forEach(function (key) {
      result[key] = deepcopy(value[key]);
    });
    return result;
  }

  config = deepcopy(config);
  const new_config = deepcopy(constants.base_config);

  new_config.title = config.title;

  // Check inverter count
  let inverter_count = parseInt(config.inverter_count);
  if (isNaN(inverter_count) || inverter_count <= 0) {
    throw new Error(
      "You don't have the 'inverter_count' config. This likely means that you haven't updated to the new config used from v0.5.0 and on. Please take a look at the project's README on GitHub for more info."
    );
  }

  // Assign inverter count
  new_config.inverter_count = inverter_count;

  let config_entities = [
    "battery_soc",
    "battery_flow",
    "home_consumption",
    "grid_flow",
    "pv_power",
    "battery_voltage",
    "backup_power",
    "grid_voltage",
    "update_time",
    "status_codes",
  ];
  for (let i = 0; i < config_entities.length; i++) {
    importConfigEntities(config, new_config, inverter_count, config_entities[i]);
  }

  let config_values = ["lux_dongle", "inverter_alias"];
  for (let i = 0; i < config_values.length; i++) {
    importConfigValues(config, new_config, inverter_count, config_values[i]);
  }

  // Check last time on update time
  if (new_config.update_time.is_used) {
    if (config.update_time) {
      new_config.update_time.show_last_update = config.update_time.show_last_update;
    }
  }

  // Check grid indicator
  if (config.grid_indicator) {
    if (config.grid_indicator.hue) {
      new_config.grid_indicator.hue = true;
    }
    if (config.grid_indicator.dot) {
      new_config.grid_indicator.dot = true;
    }
  }

  // Check refresh button
  if (new_config.lux_dongle.is_used) {
    if (config.refresh_button) {
      switch (config.refresh_button) {
        case "left":
          new_config.refresh_button.left = true;
          break;
        case "right":
          new_config.refresh_button.right = true;
          break;
        case "both":
          new_config.refresh_button.left = true;
          new_config.refresh_button.right = true;
          break;
        default:
          break;
      }
    }
  }

  // Check on status with no grid
  if (new_config.status_codes.is_used) {
    if (config.status_codes && config.status_codes.no_grid_is_warning) {
      new_config.status_codes.no_grid_is_warning = config.status_codes.no_grid_is_warning;
    }
  }

  // Check allocated energy
  if (config.energy_allocations && config.energy_allocations.entities) {
    if (config.energy_allocations.entities.length > 0) {
      new_config.energy_allocations.is_used = true;
      new_config.energy_allocations.entities = config.energy_allocations.entities;
    }
  }

  // Check parallel settings
  if (config.parallel) {
    if (config.parallel.average_voltage) {
      new_config.parallel.average_voltage = true;
    }
    if (config.parallel.parallel_first) {
      new_config.parallel.parallel_first = true;
    } else {
      new_config.parallel.parallel_first = false;
    }
  }

  validateConfig(new_config);

  return new_config;
}

function validateConfig(config) {
  if (!config.battery_soc.is_used) {
    throw new Error("You need to define entities for the battery SOC (Equal to the inverter count).");
  }

  if (!config.battery_flow.is_used) {
    throw new Error("You need to define entities for the battery flow (Equal to the inverter count).");
  }

  if (!config.grid_flow.is_used) {
    throw new Error("You need to define entities for the grid flow (Equal to the inverter count).");
  }

  if (!config.home_consumption.is_used) {
    throw new Error("You need to define entities for the home consumption (Equal to the inverter count).");
  }

  if (config.inverter_count > 1) {
    if (!config.lux_dongle.is_used && !config.inverter_alias.is_used) {
      throw new Error("You need to define entities enough dongles or aliases for each inverter.");
    }
    if (config.lux_dongle.is_used && !config.inverter_alias.is_used) {
      config.inverter_alias.is_used = true;
      config.inverter_alias.values = config.lux_dongle.values;
    }
  }
}

function importConfigEntities(config, new_config, inverter_count, object_name) {
  if (config[object_name]) {
    if (config[object_name].entities) {
      if (config[object_name].entities.length == inverter_count) {
        new_config[object_name].is_used = true;
        new_config[object_name].entities = config[object_name].entities;
      }
    }
  }
}

function importConfigValues(config, new_config, inverter_count, object_name) {
  if (config[object_name]) {
    if (config[object_name].length == inverter_count) {
      new_config[object_name].is_used = true;
      new_config[object_name].values = config[object_name];
    }
  }
}

export function getEntitiesState(config, hass, config_entity, index) {
  const entity_name = config[config_entity].entities[index];
  try {
    const entity = hass.states[entity_name];
    if (entity.state) {
      if (entity.state === "unavailable" || entity.state === "unknown") {
        return "-";
      } else {
        return entity.state;
      }
    }
    return "-";
  } catch (error) {
    handleEntityError(entity_name, config_entity);
  }
}

export function getEntitiesNumState(config, hass, config_entity, index, is_int = true, is_avg = false) {
  let value = 0;
  if (index == -1) {
    for (let i = 0; i < config.inverter_count; i++) {
      value += parseFloat(getEntitiesState(config, hass, config_entity, i));
    }
    if (is_avg) {
      value = value / config.inverter_count;
    }
  } else {
    value = parseFloat(getEntitiesState(config, hass, config_entity, index));
  }
  if (is_int) {
    return parseInt(value);
  }
  return Math.round(value * 100) / 100;
}

export function getEntitiesAttribute(config, hass, config_entity, attribute_name, index) {
  const entity_name = config[config_entity].entities[index];
  try {
    const entity = hass.states[entity_name];
    if (entity.attributes && entity.attributes[attribute_name]) {
      return entity.attributes[attribute_name];
    } else {
      return "-";
    }
  } catch (error) {
    handleEntityError(entity_name, config_entity);
  }
}

export function getEntitiesUnit(config, hass, config_entity, index) {
  const entity_name = config[config_entity].entities[index];
  try {
    const entity = hass.states[config[config_entity].entities[index]];
    if (entity.state) {
      if (isNaN(entity.state)) return "-";
      else return entity.attributes.unit_of_measurement ?? "";
    }
    return "";
  } catch (error) {
    handleEntityError(entity_name, config_entity);
  }
}

const handleEntityError = (config_entry, entity_name) => {
  if (required_entries.includes(config_entry)) {
    throw new Error(`Invalid entity: ${entity_name} for config_entry`);
  }
};

export function getStatusMessage(status_code, show_no_grid_as_warning) {
  var status_level = 0;
  var message = "Warning";

  switch (status_code) {
    case 0:
      message = `Standby`;
      status_level = 0;
      break;
    case 1:
      message = `Error`;
      status_level = 2;
      break;
    case 2:
      message = `Inverting (Programming)`;
      status_level = 1;
      break;
    case 4:
      message = `Normal`;
      status_level = 0;
      break;
    case 9:
      message = `Normal (Selling)`;
      status_level = 0;
      break;
    case 10:
    case 12:
    case 16:
    case 20:
    case 32:
    case 40:
      message = `Normal`;
      status_level = 0;
      break;
    case 17:
      message = `High temp`;
      status_level = 2;
      break;
    case 64:
    case 136:
    case 192:
      if (show_no_grid_as_warning) {
        message = `No grid`;
        status_level = 1;
      } else {
        message = `Normal`;
        status_level = 0;
      }
      break;
    default:
      message = `Unknown code ${status_code}`;
      status_level = 2;
      break;
  }

  var indicator = "";
  switch (status_level) {
    case 0:
      indicator = `🟢`;
      break;
    case 1:
      indicator = `🟠`;
      break;
    case 2:
    default:
      indicator = `🔴`;
      break;
  }

  return `${message} ${indicator}`;
}
