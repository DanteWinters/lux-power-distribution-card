import * as cef from "./config-entity-functions.js";
import * as hf from "./html-functions.js";
import * as constants from "./constants.js";

class LuxPowerDistributionCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;

    if (!this.card) {
      this.createCard();
      this.bindRefresh(this.card, this._hass, this.config);
      this.bindHistoryGraph(this.card, this.config);
    }

    this.updateCard();
  }

  setConfig(config) {
    if (!this.old_config) {
      this.old_config = cef.buildConfig(config);
    }
    this.config = cef.buildConfig(config);
    if (this.old_config != this.config) {
      this.old_config = this.config;
      this.createCard();
    }

    // console.log(this.config);
  }

  createCard() {
    if (this.card) {
      this.card.remove();
    }

    this.card = document.createElement("ha-card");
    if (this.config.header) {
      this.card.header = this.config.header;
    }

    const content = document.createElement("div");
    this.card.appendChild(content);

    this.styles = document.createElement("style");
    this.card.appendChild(this.styles);

    this.appendChild(this.card);

    // Set card base
    content.innerHTML = hf.card_base;

    // Generate Styles
    this.styles.innerHTML = hf.generateStyles(this.config);

    // Generate Status
    const inv_info_element = this.card.querySelector("#taskbar-grid");
    if (inv_info_element) {
      inv_info_element.innerHTML = hf.generateStatus(this.config);
    }

    // Generate grid
    const grid_element = this.card.querySelector("#card-grid");
    if (grid_element) {
      grid_element.innerHTML = hf.generateGrid(this.config);
    }

    // Generate update time
    const update_time_element = this.card.querySelector("#datetime-info");
    if (update_time_element) {
      update_time_element.innerHTML = hf.generateDateTime(this.config);
    }
  }

  connectedCallback() {
    this.updateCard();

    this.intervalId = setInterval(() => {
      this.updateCard();
    }, 1000);
  }

  disconnectedCallback() {
    clearInterval(this.intervalId);
  }

  updateCard() {
    if (this.card) {
      let index = 0;
      if (this.config.inverter_count > 1) {
        const inverter_selector_element = this.card.querySelector("#inverter-selector");
        if (inverter_selector_element) {
          let select_value = inverter_selector_element.value;
          let parsed_value = parseInt(select_value);
          if (!isNaN(parsed_value)) {
            index = parsed_value;
          }
        }
        if (index == this.config.inverter_count) {
          index = -1;
        }
      }
      this.updateStatus(index);
      this.updateSolar(index);
      this.updateBattery(index);
      this.updateGrid(index);
      this.updateHome(index);
      this.updateAllocatedPower();
      this.updateDateTime(index);
    }
  }

  bindRefresh(card, hass, config) {
    let refresh_button_left = card.querySelector("#refresh-button-left");
    if (refresh_button_left) {
      refresh_button_left.addEventListener("click", function (source) {
        let index = 0;
        if (config.inverter_count > 1) {
          const inverter_selector_element = card.querySelector("#inverter-selector");
          if (inverter_selector_element) {
            let select_value = inverter_selector_element.value;
            let parsed_value = parseInt(select_value);
            if (!isNaN(parsed_value)) {
              index = parsed_value;
            }
          }
        }
        if (index == config.inverter_count) {
          for (let i = 0; i < config.inverter_count; i++) {
            hass.callService("luxpower", "luxpower_refresh_registers", {
              dongle: config.lux_dongle.values[i],
            });
          }
        } else {
          hass.callService("luxpower", "luxpower_refresh_registers", {
            dongle: config.lux_dongle.values[index],
          });
        }
      });
    }
    let refresh_button_right = card.querySelector("#refresh-button-right");
    if (refresh_button_right) {
      refresh_button_right.addEventListener("click", function (source) {
        let index = 0;
        if (config.inverter_count > 1) {
          const inverter_selector_element = card.querySelector("#inverter-selector");
          if (inverter_selector_element) {
            let select_value = inverter_selector_element.value;
            let parsed_value = parseInt(select_value);
            if (!isNaN(parsed_value)) {
              index = parsed_value;
            }
          }
        }
        if (index == config.inverter_count) {
          for (let i = 0; i < config.inverter_count; i++) {
            hass.callService("luxpower", "luxpower_refresh_registers", {
              dongle: config.lux_dongle.values[i],
            });
          }
        } else {
          hass.callService("luxpower", "luxpower_refresh_registers", {
            dongle: config.lux_dongle.values[index],
          });
        }
      });
    }
  }

  bindHistoryGraph(card, config) {
    const history_map = {
      "#solar-image": "pv_power",
      "#battery-image": "battery_soc",
      "#grid-image": "grid_flow",
      "#home-image": "home_consumption",
    };

    for (const [key, value] of Object.entries(history_map)) {
      if (history_map.hasOwnProperty(key)) {
        let button_element = card.querySelector(key);
        if (button_element) {
          button_element.addEventListener("click", function (source) {
            let index = 0;
            if (config.inverter_count > 1) {
              const inverter_selector_element = card.querySelector("#inverter-selector");
              if (inverter_selector_element) {
                let select_value = inverter_selector_element.value;
                let parsed_value = parseInt(select_value);
                if (!isNaN(parsed_value)) {
                  index = parsed_value;
                }
              }
            }

            const event = new Event("hass-more-info", {
              bubbles: true,
              cancelable: false,
              composed: true,
            });
            event.detail = {
              entityId: config[value].entities[index],
            };
            card.dispatchEvent(event);
            return event;
          });
        }
      }
    }
  }

  formatPowerStates(config_entity, value, index) {
    const unit = cef.getEntitiesUnit(this.config, this._hass, config_entity, index == -1 ? 0 : index);
    if (unit == "W") {
      return `${Math.abs(parseInt(value))} ${unit}`;
    } else if (unit == "kW") {
      return `${Math.abs(parseInt(value)) * 1000} W`;
    }
  }

  updateStatus(index) {
    let msg = "";
    if (index == -1) {
      let statuses = [];
      let normal_cnt = 0;
      let error_cnt = 0;
      for (let i = 0; i < this.config.inverter_count; i++) {
        let msg_i = cef.getStatusMessage(
          parseInt(cef.getEntitiesState(this.config, this._hass, "status_codes", i)),
          this.config.status_codes.no_grid_is_warning
        );
        statuses.push(msg_i);
        if (msg_i == `Normal 🟢`) {
          normal_cnt++;
        } else {
          error_cnt++;
        }
      }
      if (error_cnt == 0) {
        // no errors
        msg = `Status: ${statuses[0]}`;
      } else if (error_cnt == 1) {
        // single error
        let filtered = statuses.filter(function (stat) {
          return stat !== "Normal 🟢";
        });
        let fault_index = statuses.indexOf(filtered[0]);
        msg = `${this.config.inverter_alias.values[fault_index]}: ${statuses[fault_index]}`;
      } else {
        // Multiple or multiple of same
        let filtered = statuses.filter(function (stat) {
          return stat !== "Normal 🟢";
        });
        let filtered_again = filtered.filter(function (stat) {
          return stat !== filtered[0];
        });
        if (filtered_again.length == 0) {
          msg = `Status: ${statuses[0]}`;
        } else {
          msg = `Multiple errors 🔴`;
        }
      }
    } else {
      msg = cef.getStatusMessage(
        parseInt(cef.getEntitiesState(this.config, this._hass, "status_codes", index)),
        this.config.status_codes.no_grid_is_warning
      );
      msg = `Status: ${msg}`;
    }
    const status_element = this.card.querySelector("#status-cell");
    if (status_element) {
      status_element.innerHTML = msg;
    }
  }

  updateSolar(index) {
    const solar_arrow_element = this.card.querySelector("#solar-arrows");
    const solar_info_element = this.card.querySelector("#solar-info");
    if (solar_arrow_element && solar_info_element) {
      let pv_power = cef.getEntitiesNumState(this.config, this._hass, "pv_power", index);
      // Arrow
      const arrow_direction = pv_power > 0 ? "arrows-down" : "arrows-none";
      if (solar_arrow_element.className != `cell arrow-cell ${arrow_direction}`) {
        solar_arrow_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
        solar_arrow_element.innerHTML = hf.generateArrows();
      }
      // Info
      solar_info_element.innerHTML = `
        <div>
          <p class="header-text">${this.formatPowerStates("pv_power", pv_power, index)}</p>
          <p class="sub-text">${pv_power > 0 ? "Solar Import" : ""}</p>
        </div>
      `;
    }
  }

  updateBattery(index) {
    let battery_soc = cef.getEntitiesNumState(this.config, this._hass, "battery_soc", index, true, true);
    let battery_flow = cef.getEntitiesNumState(this.config, this._hass, "battery_flow", index);
    const battery_arrow_element = this.card.querySelector("#battery-arrows");
    // Image
    const battery_image_element = this.card.querySelector("#battery-image");
    if (battery_image_element) {
      battery_image_element.innerHTML = `<img src="${constants.getBatteryImage(parseInt(battery_soc))}">`;
    }
    if (this.config.battery_flow.is_used) {
      // Arrow
      const arrow_direction = battery_flow < 0 ? "arrows-right" : battery_flow > 0 ? "arrows-left" : "arrows-none";
      if (battery_arrow_element) {
        if (battery_arrow_element.className != `cell arrow-cell ${arrow_direction}`) {
          battery_arrow_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
          battery_arrow_element.innerHTML = hf.generateArrows();
        }
      }
      // Charge info
      const battery_charge_info_element = this.card.querySelector("#battery-charge-info");
      battery_charge_info_element.innerHTML = `
        <div>
          <p class="header-text">${this.formatPowerStates("battery_flow", battery_flow, index)}</p>
          <p class="sub-text">${
            battery_flow > 0 ? "Battery Charging" : battery_flow < 0 ? "Battery Discharging" : "Idle"
          }</p>
        </div>
      `;
    }
    var battery_voltage = "";
    if (this.config.battery_voltage.is_used && index != -1) {
      battery_voltage = `${cef.getEntitiesState(this.config, this._hass, "battery_voltage", index, false)} Vdc`;
    } else if (this.config.parallel.average_voltage) {
      battery_voltage = `${cef.getEntitiesNumState(
        this.config,
        this._hass,
        "battery_voltage",
        index,
        false,
        true
      )} Vdc (avg)`;
    }
    const battery_soc_info_element = this.card.querySelector("#battery-soc-info");
    if (battery_soc_info_element) {
      battery_soc_info_element.innerHTML = `
        <div>
          <p class="header-text">${battery_soc}%</p>
          <p class="header-text">${battery_voltage}</p>
        </div>
    `;
    }
  }

  updateGrid(index) {
    // Arrow
    const grid_arrow_1_element = this.card.querySelector("#grid-arrows-1");
    const grid_arrow_2_element = this.card.querySelector("#grid-arrows-2");
    let grid_flow = cef.getEntitiesNumState(this.config, this._hass, "grid_flow", index);
    if (grid_arrow_1_element && grid_arrow_2_element) {
      const arrow_direction = grid_flow < 0 ? "arrows-left" : grid_flow > 0 ? "arrows-right" : "arrows-none";
      if (grid_arrow_1_element.className != `cell arrow-cell ${arrow_direction}`) {
        grid_arrow_1_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
        grid_arrow_2_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
        grid_arrow_1_element.innerHTML = hf.generateArrows();
        grid_arrow_2_element.innerHTML = hf.generateArrows();
      }
    }
    var grid_emoji = ``;
    if (this.config.grid_voltage.is_used && index != -1) {
      var grid_voltage = parseInt(cef.getEntitiesState(this.config, this._hass, "grid_voltage", index));
      const grid_image_element = this.card.querySelector("#grid-image");
      if (this.config.grid_indicator.hue) {
        grid_image_element.setAttribute(
          "class",
          grid_voltage == 0 ? `cell image-cell blend-overlay` : `cell image-cell`
        );
      }
      if (this.config.grid_indicator.dot) {
        grid_emoji = grid_voltage == 0 ? ` 🔴` : ``;
      }
    }

    // Info
    const grid_info_element = this.card.querySelector("#grid-info");
    if (grid_info_element) {
      grid_voltage = ``;
      if (this.config.grid_voltage.is_used) {
        if (index != -1) {
          grid_voltage = `${cef.getEntitiesState(this.config, this._hass, "grid_voltage", index)} Vac${grid_emoji}`;
        } else if (this.config.parallel.average_voltage) {
          grid_voltage = `${cef.getEntitiesNumState(
            this.config,
            this._hass,
            "grid_voltage",
            index,
            false,
            true
          )} Vac (avg)${grid_emoji}`;
        }
      }
      grid_info_element.innerHTML = `
        <div>
          <p class="header-text">${this.formatPowerStates("grid_flow", grid_flow, index)}</p>
          <p class="header-text">${grid_voltage}</p>
        </div>
      `;
    }
  }

  updateHome(index) {
    let home_consumption = cef.getEntitiesNumState(this.config, this._hass, "home_consumption", index);
    let backup_power = 0;
    // Arrow
    const home_arrow_element = this.card.querySelector("#home-arrows");
    if (home_arrow_element) {
      backup_power = this.config.backup_power.is_used
        ? (backup_power = cef.getEntitiesNumState(this.config, this._hass, "backup_power", index))
        : 0;
      const arrow_direction = home_consumption > 0 || backup_power > 0 ? "arrows-down" : "arrows-none";
      if (home_arrow_element.className != `cell arrow-cell ${arrow_direction}`) {
        home_arrow_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
        home_arrow_element.innerHTML = hf.generateArrows();
      }
    }
    // Info
    const home_info_element = this.card.querySelector("#home-info");
    if (home_info_element) {
      var sub_text = "Home Usage";
      var value = this.formatPowerStates("home_consumption", home_consumption, index);

      if (this.config.backup_power.is_used && home_consumption == 0 && backup_power > 0) {
        sub_text = "Backup Power";
        value = this.formatPowerStates("backup_power", backup_power, index);
      }

      home_info_element.innerHTML = `
        <div>
          <p class="sub-text">${sub_text}</p>
          <p class="header-text">${value}</p>
        </div>
      `;
    }
  }

  updateDateTime(index) {
    if (index == -1) {
      const update_time_element = this.card.querySelector("#time-info");
      if (update_time_element) {
        let oldest_time = Date.parse(cef.getEntitiesState(this.config, this._hass, "update_time", 0));
        let olderst_index = 0;
        for (let i = 1; i < this.config.inverter_count; i++) {
          if (Date.parse(cef.getEntitiesState(this.config, this._hass, "update_time", i)) < oldest_time) {
            olderst_index = i;
            oldest_time = Date.parse(cef.getEntitiesState(this.config, this._hass, "update_time", i));
          }
        }
        update_time_element.innerHTML = `${
          this.config.inverter_alias.values[olderst_index]
        } updated at: ${cef.getEntitiesState(this.config, this._hass, "update_time", olderst_index)}`;
        const since_time_element = this.card.querySelector("#since-info");
        if (since_time_element) {
          var last_time_ts = cef.getEntitiesAttribute(
            this.config,
            this._hass,
            "update_time",
            "timestamp",
            olderst_index
          );
          var time_now = Date.now() / 1000;
          var diff = time_now - last_time_ts;

          var time_since = ``;
          switch (true) {
            case diff <= 2:
              time_since = `now`;
              break;
            case diff < 60:
              time_since = `${Math.round(diff)} seconds ago`;
              break;
            case diff < 120:
              time_since = `1 minute ago`;
              break;
            case diff >= 120:
              time_since = `${Math.round(diff / 60)} minutes ago`;
              break;
          }
          since_time_element.innerHTML = `${time_since}`;
        }
      }
    } else {
      const update_time_element = this.card.querySelector("#time-info");
      if (update_time_element) {
        update_time_element.innerHTML = `Last update at: ${cef.getEntitiesState(
          this.config,
          this._hass,
          "update_time",
          index
        )}`;
      }
      const since_time_element = this.card.querySelector("#since-info");
      if (since_time_element) {
        var last_time_ts = cef.getEntitiesAttribute(this.config, this._hass, "update_time", "timestamp", index);
        var time_now = Date.now() / 1000;
        var diff = time_now - last_time_ts;

        var time_since = ``;
        switch (true) {
          case diff <= 2:
            time_since = `now`;
            break;
          case diff < 60:
            time_since = `${Math.round(diff)} seconds ago`;
            break;
          case diff < 120:
            time_since = `1 minute ago`;
            break;
          case diff >= 120:
            time_since = `${Math.round(diff / 60)} minutes ago`;
            break;
        }
        since_time_element.innerHTML = `${time_since}`;
      }
    }
  }

  updateAllocatedPower() {
    // Arrow
    if (this.config.energy_allocations.is_used) {
      const power_allocation_arrow_element = this.card.querySelector("#power-allocation-arrows");
      if (power_allocation_arrow_element) {
        if (power_allocation_arrow_element.className != `cell arrow-cell arrows-right`) {
          power_allocation_arrow_element.setAttribute("class", `cell arrow-cell arrows-right`);
          power_allocation_arrow_element.innerHTML = hf.generateArrows();
        }

        const power_allocation_info_element = this.card.querySelector("#power-allocation-info");
        power_allocation_info_element.innerHTML = `
          <div>
            <p class="sub-text">Allocated Power</p>
            <p class="header-text">${parseInt(this.getAllocatedPower())} W</p>
          </div>
        `;
      }
    }
  }

  getAllocatedPower() {
    let allocatedEnergy = 0;
    if (this.config.energy_allocations.is_used) {
      for (let i = 0; i < this.config.energy_allocations.entities.length; i++) {
        let entity_name = this.config.energy_allocations.entities[i];
        try {
          let entity = this._hass.states[entity_name];
          let entity_value = entity.state;
          let entity_unit = entity.attributes.unit_of_measurement;
          if (entity_value === "unavailable" || entity_value === "unknown") {
            entity_unit = "nan";
          }
          if (entity_unit == "W") {
            allocatedEnergy += parseFloat(entity_value);
          } else if (entity_unit == "kW") {
            allocatedEnergy += parseFloat(entity_value) * 1000;
          }
        } catch (error) {
          throw new Error(`Invalid entity: ${entity_name}`);
        }
      }
    }
    return allocatedEnergy;
  }
}

customElements.define("lux-power-distribution-card", LuxPowerDistributionCard);
