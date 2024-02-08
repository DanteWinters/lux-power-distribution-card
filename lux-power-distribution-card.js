import * as cef from "./config-entity-functions.js";
import * as hf from "./html-functions.js";
import * as constants from "./constants.js";

class LuxPowerDistributionCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;

    if (!this.content) {
      this.createCard();
      this.bindRefresh(this.card, this._hass, this._config);
      this.bindHistoryGraph(this.card, this._config);
      this.bindHistoryGraphMulti(this.card, this._config);
    }

    this.updateCard();
  }

  setConfig(config) {
    this._config = cef.buildConfig(config);
  }

  createCard() {
    if (!this._hass || !this._config) {
      return;
    }
    const shadowRoot = this.shadowRoot;

    this.card = document.createElement("ha-card");
    if (this._config.title) {
      const header = document.createElement("h1");
      header.classList.add("card-header");
      header.appendChild(document.createTextNode(this._config.title));
      this.card.appendChild(header);
    }

    this.content = document.createElement("div");
    this.content.classList.add("card-content");

    this.content.innerHTML = `
      <style>${hf.generateStyles(this._config)}</style>
      <div id="taskbar-grid" class="status-grid">${hf.generateStatus(this._config)}</div>
      <div id="card-grid" class="diagram-grid">${hf.generateGrid(this._config)}</div>
      <div id="datetime-info" class="update-time">${hf.generateDateTime(this._config)}</div>
    `;

    this.card.appendChild(this.content);

    while (shadowRoot.lastChild) {
      shadowRoot.removeChild(shadowRoot.lastChild);
    }
    shadowRoot.appendChild(this.card);
  }

  updateCard() {
    if (this.content) {
      let index = 0;
      if (this._config.inverter_count > 1) {
        const inverter_selector_element = this.shadowRoot.querySelector("#inverter-selector");
        if (inverter_selector_element) {
          let select_value = inverter_selector_element.value;
          let parsed_value = parseInt(select_value);
          if (!isNaN(parsed_value)) {
            index = parsed_value;
          }
        }
        if (index == this._config.inverter_count) {
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
      this.updateInverterPic(index);
    }
  }

  bindRefresh(card, hass, config) {
    const refresh_list = ["#refresh-button-left", "#refresh-button-right"];

    for (let i = 0; i < refresh_list.length; i++) {
      let refresh_button = card.querySelector(refresh_list[i]);
      if (refresh_button) {
        refresh_button.addEventListener("click", function (source) {
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
            for (let j = 0; j < config.inverter_count; j++) {
              console.log(config.lux_dongle.values[i]);
              hass.callService("luxpower", "luxpower_refresh_registers", {
                dongle: config.lux_dongle.values[i],
              });
              console.log(config.lux_dongle.values[i]);
            }
          } else {
            hass.callService("luxpower", "luxpower_refresh_registers", {
              dongle: config.lux_dongle.values[index],
            });
          }
        });
      }
    }
  }

  bindHistoryGraph(card, config) {
    var history_map = {
      "#solar-image": "pv_power",
      "#battery-image": "battery_flow",
      "#battery-soc-info": "battery_soc",
      "#grid-image": "grid_flow",
    };
    if (!config.backup_power.is_used) {
      history_map["#home-image"] = "home_consumption";
    }
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

  bindHistoryGraphMulti(card, config) {
    if (config.backup_power.is_used) {
      let button_element = card.querySelector("#home-image");
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

          const entityIds = [config["home_consumption"].entities[index], config["backup_power"].entities[index]];
          let currentIndex = 0;

          function openNextHistoryView() {
            if (currentIndex < entityIds.length) {
              const entityId = entityIds[currentIndex];
              const event = new Event("hass-more-info", {
                bubbles: true,
                cancelable: false,
                composed: true,
              });

              event.detail = {
                entityId: entityId,
              };
              card.dispatchEvent(event);
              currentIndex++;
              document.querySelector("home-assistant").addEventListener("dialog-closed", openNextHistoryView);
            }
          }

          openNextHistoryView();
        });
      }
    }
  }

  formatPowerStates(config_entity, value, index) {
    const unit = cef.getEntitiesUnit(this._config, this._hass, config_entity, index == -1 ? 0 : index);
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
      for (let i = 0; i < this._config.inverter_count; i++) {
        let msg_i = cef.getStatusMessage(
          parseInt(cef.getEntitiesState(this._config, this._hass, "status_codes", i)),
          this._config.status_codes.no_grid_is_warning
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
        msg = `${this._config.inverter_alias.values[fault_index]}: ${statuses[fault_index]}`;
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
        parseInt(cef.getEntitiesState(this._config, this._hass, "status_codes", index)),
        this._config.status_codes.no_grid_is_warning
      );
      msg = `Status: ${msg}`;
    }
    const status_element = this.shadowRoot.querySelector("#status-cell");
    if (this._config.status_codes.is_used && status_element) {
      status_element.innerHTML = msg;
    }
  }

  updateSolar(index) {
    const solar_arrow_element = this.shadowRoot.querySelector("#solar-arrows");
    const solar_info_element = this.shadowRoot.querySelector("#solar-info");
    if (solar_arrow_element && solar_info_element) {
      let pv_power = cef.getEntitiesNumState(this._config, this._hass, "pv_power", index);
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
          <p class="sub-text">${pv_power > 0 ? "PV Power" : ""}</p>
        </div>
      `;
    }
  }

  updateBattery(index) {
    let battery_soc = cef.getEntitiesNumState(this._config, this._hass, "battery_soc", index, true, true);
    let battery_flow = cef.getEntitiesNumState(this._config, this._hass, "battery_flow", index);
    const battery_arrow_element = this.shadowRoot.querySelector("#battery-arrows");
    // Image
    const battery_image_element = this.shadowRoot.querySelector("#battery-image");
    if (battery_image_element) {
      battery_image_element.innerHTML = `<img src="${constants.getBatteryImage(parseInt(battery_soc))}">`;
    }
    if (this._config.battery_flow.is_used) {
      // Arrow
      const arrow_direction = battery_flow < 0 ? "arrows-right" : battery_flow > 0 ? "arrows-left" : "arrows-none";
      if (battery_arrow_element) {
        if (battery_arrow_element.className != `cell arrow-cell ${arrow_direction}`) {
          battery_arrow_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
          battery_arrow_element.innerHTML = hf.generateArrows();
        }
      }
      // Charge info
      const battery_charge_info_element = this.shadowRoot.querySelector("#battery-charge-info");
      battery_charge_info_element.innerHTML = `
        <div>
          <p class="header-text">${this.formatPowerStates("battery_flow", battery_flow, index)}</p>
          <p class="sub-text">${battery_flow > 0 ? "Charge Power" : battery_flow < 0 ? "Discharge Power" : "Idle"}</p>
        </div>
      `;
    }
    var battery_voltage = "";
    if (this._config.battery_voltage.is_used && index != -1) {
      battery_voltage = `${cef.getEntitiesState(this._config, this._hass, "battery_voltage", index, false)} Vdc`;
    } else if (this._config.battery_voltage.is_used && this._config.parallel.average_voltage) {
      battery_voltage = `${cef.getEntitiesNumState(this._config, this._hass, "battery_voltage", index, false, true)} Vdc (avg)`;
    }
    const battery_soc_info_element = this.shadowRoot.querySelector("#battery-soc-info");
    if (battery_soc_info_element) {
      battery_soc_info_element.innerHTML = `
        <div>
          ${this._config.battery_voltage.is_used ? `<p class="header-text">${battery_voltage}</p>` : ``}
          <p class="header-text">${battery_soc}%</p>
        </div>
    `;
    }
  }

  updateGrid(index) {
    // Arrow
    const grid_arrow_1_element = this.shadowRoot.querySelector("#grid-arrows-1");
    const grid_arrow_2_element = this.shadowRoot.querySelector("#grid-arrows-2");
    let grid_flow = cef.getEntitiesNumState(this._config, this._hass, "grid_flow", index);
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
    if (this._config.grid_voltage.is_used && index != -1) {
      var grid_voltage = parseInt(cef.getEntitiesState(this._config, this._hass, "grid_voltage", index));
      const grid_image_element = this.shadowRoot.querySelector("#grid-image");
      if (this._config.grid_indicator.hue) {
        grid_image_element.setAttribute("class", grid_voltage == 0 ? `cell image-cell blend-overlay` : `cell image-cell`);
      }
      if (this._config.grid_indicator.dot) {
        grid_emoji = grid_voltage == 0 ? ` 🔴` : ``;
      }
    }

    // Info
    const grid_info_element = this.shadowRoot.querySelector("#grid-info");
    if (grid_info_element) {
      grid_voltage = ``;
      if (this._config.grid_voltage.is_used) {
        if (index != -1) {
          grid_voltage = `${cef.getEntitiesState(this._config, this._hass, "grid_voltage", index)} Vac${grid_emoji}`;
        } else if (this._config.parallel.average_voltage) {
          grid_voltage = `${cef.getEntitiesNumState(this._config, this._hass, "grid_voltage", index, false, true)} Vac (avg)${grid_emoji}`;
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
    let home_consumption = cef.getEntitiesNumState(this._config, this._hass, "home_consumption", index);
    let backup_power = 0;
    // Arrow
    const home_arrow_element = this.shadowRoot.querySelector("#home-arrows");
    if (home_arrow_element) {
      backup_power = this._config.backup_power.is_used
        ? (backup_power = cef.getEntitiesNumState(this._config, this._hass, "backup_power", index))
        : 0;
      const arrow_direction = home_consumption > 0 || backup_power > 0 ? "arrows-down" : "arrows-none";
      if (home_arrow_element.className != `cell arrow-cell ${arrow_direction}`) {
        home_arrow_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
        home_arrow_element.innerHTML = hf.generateArrows();
      }
    }
    // Info
    const home_info_element = this.shadowRoot.querySelector("#home-info");
    if (home_info_element) {
      var sub_text = "Home Usage";
      var value = this.formatPowerStates("home_consumption", home_consumption, index);

      if (this._config.backup_power.is_used && home_consumption == 0 && backup_power > 0) {
        sub_text = "Backup Power";
        value = this.formatPowerStates("backup_power", backup_power, index);
      }

      home_info_element.innerHTML = `
        <div>
          <p class="header-text">${value}</p>
          <p class="sub-text">${sub_text}</p>
        </div>
      `;
    }
  }

  updateDateTime(index) {
    if (index == -1) {
      const update_time_element = this.shadowRoot.querySelector("#time-info");
      if (update_time_element) {
        let oldest_time = Date.parse(cef.getEntitiesState(this._config, this._hass, "update_time", 0));
        let olderst_index = 0;
        for (let i = 1; i < this._config.inverter_count; i++) {
          if (Date.parse(cef.getEntitiesState(this._config, this._hass, "update_time", i)) < oldest_time) {
            olderst_index = i;
            oldest_time = Date.parse(cef.getEntitiesState(this._config, this._hass, "update_time", i));
          }
        }
        update_time_element.innerHTML = `${this._config.inverter_alias.values[olderst_index]} updated at: ${cef.getEntitiesState(
          this._config,
          this._hass,
          "update_time",
          olderst_index
        )}`;
        const since_time_element = this.shadowRoot.querySelector("#since-info");
        if (since_time_element) {
          var last_time_ts = cef.getEntitiesAttribute(this._config, this._hass, "update_time", "timestamp", olderst_index);
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
      const update_time_element = this.shadowRoot.querySelector("#time-info");
      if (update_time_element) {
        update_time_element.innerHTML = `Last update at: ${cef.getEntitiesState(this._config, this._hass, "update_time", index)}`;
      }
      const since_time_element = this.shadowRoot.querySelector("#since-info");
      if (since_time_element) {
        var last_time_ts = cef.getEntitiesAttribute(this._config, this._hass, "update_time", "timestamp", index);
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
    if (this._config.energy_allocations.is_used) {
      const power_allocation_arrow_element = this.shadowRoot.querySelector("#power-allocation-arrows");
      if (power_allocation_arrow_element) {
        const allocated_power = this.getAllocatedPower();
        var allocated_power_arrow_direction = ``;
        if (allocated_power == 0) {
          allocated_power_arrow_direction = `cell arrow-cell arrows-none`;
        } else {
          allocated_power_arrow_direction = `cell arrow-cell arrows-right`;
        }
        if (power_allocation_arrow_element.className != allocated_power_arrow_direction) {
          power_allocation_arrow_element.setAttribute("class", allocated_power_arrow_direction);
          power_allocation_arrow_element.innerHTML = hf.generateArrows();
        }

        const power_allocation_info_element = this.shadowRoot.querySelector("#power-allocation-info");
        power_allocation_info_element.innerHTML = `
          <div>
          <p class="header-text">${parseInt(this.getAllocatedPower())} W</p>
            <p class="sub-text">Allocated Power</p>
          </div>
        `;
      }
    }
  }

  updateInverterPic(index) {
    const inverter_pic_element = this.shadowRoot.querySelector("#inverter-image");
    if (inverter_pic_element) {
      if (index == -1) {
        inverter_pic_element.innerHTML = `<img src="${constants.getBase64Data("parallel-inverter")}">`;
      } else {
        inverter_pic_element.innerHTML = `<img src="${constants.getBase64Data("inverter")}">`;
      }
    }
  }

  getAllocatedPower() {
    let allocatedEnergy = 0;
    if (this._config.energy_allocations.is_used) {
      for (let i = 0; i < this._config.energy_allocations.entities.length; i++) {
        let entity_name = this._config.energy_allocations.entities[i];
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
