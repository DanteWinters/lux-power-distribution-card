class LuxPowerDistributionCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;

    if (!this.card) {
      this._createCard();
    }

    this._update();
  }

  setConfig(config) {
    // Required Entities
    if (!config.battery_soc || !config.battery_soc.entity) {
      throw new Error("You need to define an entity for the battery SOC.");
    }
    if (!config.battery_flow || !config.battery_flow.entity) {
      throw new Error("You need to define an entity for the battery flow.");
    }
    if (!config.home_consumption || !config.home_consumption.entity) {
      throw new Error("You need to define an entity for the home consumption.");
    }
    if (!config.grid_flow || !config.grid_flow.entity) {
      throw new Error("You need to define an entity for the grid flow.");
    }
    // Optional Entities (Currently required, will change to optional later.)
    if (!config.battery_voltage || !config.battery_voltage.entity) {
      throw new Error("You need to define an entity for the battery voltage.");
    }
    if (!config.pv_power || !config.pv_power.entity) {
      throw new Error("You need to define an entity for the PV power.");
    }
    if (!config.backup_power || !config.backup_power.entity) {
      throw new Error(
        "You need to define an entity for the backup power (EPS)."
      );
    }
    if (!config.grid_voltage || !config.grid_voltage.entity) {
      throw new Error("You need to define an entity for the grid voltage.");
    }

    this.config = JSON.parse(JSON.stringify(config));

    // if (!this.config.inner.min) {
    //     this.config.inner.min = this.config.min;
    // }
  }

  _update() {
    if (
      this._hass.states[this.config["battery_soc"].entity] == undefined ||
      this._hass.states[this.config["battery_flow"].entity] == undefined ||
      this._hass.states[this.config["home_consumption"].entity] == undefined ||
      this._hass.states[this.config["grid_flow"].entity] == undefined ||
      this._hass.states[this.config["battery_voltage"].entity] == undefined ||
      this._hass.states[this.config["pv_power"].entity] == undefined ||
      this._hass.states[this.config["backup_power"].entity] == undefined ||
      this._hass.states[this.config["grid_voltage"].entity] == undefined
    ) {
      console.warn("Undefined entity");
      if (this.card) {
        this.card.remove();
      }

      this.card = document.createElement("ha-card");
      if (this.config.header) {
        this.card.header = this.config.header;
      }

      const content = document.createElement("p");
      content.style.background = "#e8e87a";
      content.style.padding = "8px";
      content.innerHTML = "Error finding entities.";
      this.card.appendChild(content);

      this.appendChild(this.card);
      return;
    } else if (
      this.card &&
      this.card.firstElementChild.tagName.toLowerCase() == "p"
    ) {
      this._createCard();
    }
    this._updateStates();
  }

  _updateStates() {
    // Required Entities
    // Battery SOC
    const batterySocValue = this._getConfigEntityStateValue("battery_soc");
    this._setCssVariable(this.nodes.content, "battery-soc", "--%");
    this.nodes["battery_soc"].innerHTML = this._formatValue(
      batterySocValue,
      "%"
    );

    // Battery Flow
    const batteryFlowValue = this._getConfigEntityStateValue("battery_flow");
    this._setCssVariable(this.nodes.content, "battery-flow", "--W");
    this.nodes["battery_flow"].innerHTML = this._formatValue(
      batteryFlowValue,
      "W"
    );
    const batteryFlowDirection =
      "arrow-cell arrows-" +
      (batteryFlowValue > 0 ? "left" : batteryFlowValue < 0 ? "right" : "none");
    const batteryFlowDescription =
      batteryFlowValue > 0
        ? "Battery Charging"
        : batteryFlowValue < 0
        ? "Battery Discharging"
        : "";
    this._setCssVariable(this.nodes.content, "battery-flow-description", "");
    this.nodes["battery_flow_description"].innerHTML = batteryFlowDescription;

    // Home Consumption
    const homeConsumptionValue =
      this._getConfigEntityStateValue("home_consumption");
    this._setCssVariable(this.nodes.content, "home-consumption", "--W");
    this.nodes["home_consumption"].innerHTML = this._formatValue(
      homeConsumptionValue,
      "W"
    );

    // Grid Flow
    const gridFlowValue = this._getConfigEntityStateValue("grid_flow");
    this._setCssVariable(this.nodes.content, "grid-flow", "--W");
    this.nodes["grid_flow"].innerHTML = this._formatValue(gridFlowValue, "W");
    const gridFlowDirection =
      "arrow-cell arrows-" +
      (gridFlowValue < 0 ? "left" : gridFlowValue > 0 ? "right" : "none");

    // Not-required Entities
    // Battery Voltage
    const batteryVoltageValue =
      this._getConfigEntityStateValue("battery_voltage");
    this._setCssVariable(this.nodes.content, "battery-voltage", "--Vdc");
    this.nodes["battery_voltage"].innerHTML = this._formatValue(
      batteryVoltageValue,
      "Vdc",
      false
    );

    // PV Power
    const pvPowerValue = this._getConfigEntityStateValue("pv_power");
    this._setCssVariable(this.nodes.content, "pv-power", "--W");
    this.nodes["pv_power"].innerHTML = this._formatValue(pvPowerValue, "W");
    const pvPowerDirection =
      "arrow-cell arrows-" + (pvPowerValue > 0 ? "down" : "none");
    const pvPowerDescription = pvPowerValue > 0 ? "Solar Input" : "";
    this._setCssVariable(this.nodes.content, "pv-power-description", "");
    this.nodes["pv_power_description"].innerHTML = pvPowerDescription;

    // EPS Power
    const epsPowerValue = this._getConfigEntityStateValue("backup_power");
    this._setCssVariable(this.nodes.content, "backup-power", "--W");
    this.nodes["backup_power"].innerHTML = this._formatValue(
      epsPowerValue,
      "W"
    );
    const homeConsumptionDirection =
      "arrow-cell arrows-" +
      (homeConsumptionValue > 0 || epsPowerValue > 0 ? "down" : "none");

    // Battery Voltage
    const gridVoltageValue = this._getConfigEntityStateValue("grid_voltage");
    this._setCssVariable(this.nodes.content, "grid-voltage", "--Vdc");
    this.nodes["grid_voltage"].innerHTML = this._formatValue(
      gridVoltageValue,
      "Vac",
      false
    );

    // Get Arrows
    const arrows = this.card.getElementsByClassName("arrow-cell");

    // Solar Arrow [0]
    arrows[0].setAttribute("class", pvPowerDirection);

    // Battery Arrow [1]
    arrows[1].setAttribute("class", batteryFlowDirection);

    // Inverter Arrow [2]
    arrows[2].setAttribute("class", gridFlowDirection);

    // Grid Arrow [3]
    arrows[3].setAttribute("class", gridFlowDirection);

    // Home Arrow [4]
    arrows[4].setAttribute("class", homeConsumptionDirection);
  }

  // _showDetails(configEntity) {
  //   const event = new Event('hass-more-info', {
  //     bubbles: true,
  //     cancelable: false,
  //     composed: true
  //   });
  //   event.detail = {
  //     entityId: this.config[configEntity].entity
  //   };
  //   this.card.dispatchEvent(event);
  //   return event;
  // }

  _formatValue(value, unit, to_int_abs = true) {
    return to_int_abs ? Math.abs(parseInt(value)) + unit : value + unit;
  }

  _getConfigEntityStateValue(config_entity) {
    const entity = this._hass.states[this.config[config_entity].entity];

    if (isNaN(entity.state)) return "-"; //check if entity state is NaN
    else return entity.state;
  }

  _createCard() {
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

    content.innerHTML = `
        <ha-card>
              <style>
                  ha-card {
                      width: auto;
                  }
  
                  .diagram-grid {
                      display: grid;
                      grid-template-columns: repeat(6, 1fr);
                      grid-template-rows: repeat(5, 1fr);
                  }
  
                  .diagram-grid img {
                      max-width: 100%;
                      height: auto;
                  }
  
                  .cell {
                      /* border: 1px solid #ccc; */
                      width: 100%;
                      height: auto;
                  }
  
                  .cell-header {}
  
                  .cell-description {}
  
                  .image-cell {
                      display: flex;
                      justify-content: center;
                  }
  
                  .image-cell img {
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      /* width: auto;
                      height: 100%; */
                      object-fit: contain;
                  }
  
                  .arrow-cell {
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      position: relative;
                  }
  
                  .arrow-cell img {
                      src: url("https://img.icons8.com/color/256/chevron-left.png");
                  }
  
                  .arrow-1 {}
  
                  .arrow-2 {}
  
                  .arrow-3 {}
  
                  .arrow-4 {}
  
                  .arrow-1 img {
                      animation: arrow-animation-1 1.5s infinite;
                  }
  
                  .arrow-2 img {
                      animation: arrow-animation-2 1.5s infinite;
                  }
  
                  .arrow-3 img {
                      animation: arrow-animation-3 1.5s infinite;
                  }
  
                  .arrow-4 img {
                      animation: arrow-animation-4 1.5s infinite;
                  }
  
                  @keyframes arrow-animation-1 {
                      0% {
                          opacity: 1;
                      }
  
                      25% {
                          opacity: 0.4;
                      }
  
                      50% {
                          opacity: 0.4;
                      }
  
                      75% {
                          opacity: 0.4;
                      }
  
                      100% {
                          opacity: 1;
                      }
                  }
  
                  @keyframes arrow-animation-2 {
                      0% {
                          opacity: 0.4;
                      }
  
                      25% {
                          opacity: 0.4;
                      }
  
                      50% {
                          opacity: 0.4;
                      }
  
                      75% {
                          opacity: 1;
                      }
  
                      100% {
                          opacity: 0.4;
                      }
                  }
  
                  @keyframes arrow-animation-3 {
                      0% {
                          opacity: 0.4;
                      }
  
                      25% {
                          opacity: 0.4;
                      }
  
                      50% {
                          opacity: 1;
                      }
  
                      75% {
                          opacity: 0.4;
                      }
  
                      100% {
                          opacity: 0.4;
                      }
                  }
  
                  @keyframes arrow-animation-4 {
                      0% {
                          opacity: 0.4;
                      }
  
                      25% {
                          opacity: 1;
                      }
  
                      50% {
                          opacity: 0.4;
                      }
  
                      75% {
                          opacity: 0.4;
                      }
  
                      100% {
                          opacity: 0.4;
                      }
                  }
  
                  .arrows-left {
                      transform: rotate(0deg);
                  }
  
                  .arrows-up {
                      transform: rotate(90deg);
                  }
  
                  .arrows-right {
                      transform: rotate(180deg);
                  }
  
                  .arrows-down {
                      transform: rotate(-90deg);
                  }
  
                  .arrows-none {
                      opacity: 0;
                  }
              </style>
  
              <div class="diagram-grid">
                  <div class="cell"></div>
                  <div class="cell"></div>
                  <div class="cell image-cell"><img src="/local/community/lux-power-distribution-card/images/solar.png">
                  </div>
                  <div class="cell">
                      <div class="cell-header">
                          <h2 class="pv-power"></h2>
                      </div>
                      <div class="cell-description">
                          <p class="pv-power-description"></p>
                      </div>
                  </div>
                  <div class="cell"></div>
                  <div class="cell"></div>
  
                  <div class="cell">
                      <div class="cell-header">
                          <h2 class="battery-flow"></h2>
                      </div>
                      <div class="cell-description">
                          <p class="battery-flow-description"></p>
                      </div>
                  </div>
                  <div class="cell"></div>
                  <div class="cell arrow-cell arrows-down">
                      <div class="arrow-1"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-2"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-3"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-4"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                  </div>
                  <div class="cell"></div>
                  <div class="cell"></div>
                  <div class="cell"></div>
  
                  <div class="cell image-cell"><img src="/local/community/lux-power-distribution-card/images/battery-5.png">
                  </div>
                  <div class="cell arrow-cell arrows-right">
                      <div class="arrow-1"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-2"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-3"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-4"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                  </div>
                  <div class="cell image-cell"><img src="/local/community/lux-power-distribution-card/images/inverter.png">
                  </div>
                  <div class="cell arrow-cell arrows-right">
                      <div class="arrow-1"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-2"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-3"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-4"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                  </div>
                  <div class="cell arrow-cell arrows-left">
                      <div class="arrow-1"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-2"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-3"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-4"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                  </div>
                  <div class="cell image-cell"><img src="/local/community/lux-power-distribution-card/images/grid.png">
                  </div>
  
                  <div class="cell">
                      <div class="cell-header">
                          <h2 class="battery-soc"></h2>
                      </div>
                      <div class="cell-header">
                          <h2 class="battery-voltage"></h2>
                      </div>
                  </div>
                  <div class="cell battery-voltage"></div>
                  <div class="cell arrow-cell arrows-down">
                      <div class="arrow-1"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-2"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-3"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                      <div class="arrow-4"><img src="/local/community/lux-power-distribution-card/images/arrow-left.png"></div>
                  </div>
                  <div class="cell"></div>
                  <div class="cell"></div>
                  <div class="cell">
                      <div class="cell-header">
                          <h2 class="grid-flow"></h2>
                      </div>
                      <div class="cell-header">
                          <h2 class="grid-voltage"></h2>
                      </div>
                  </div>
  
                  <div class="cell"></div>
                  <div class="cell"></div>
                  <div class="cell image-cell"><img src="/local/community/lux-power-distribution-card/images/house.png">
                  </div>
                  <div class="cell">
                      <div class="cell-header">
                          <h2 class="home-consumption"></h2>
                      </div>
                      <div class="cell-header">
                          <h2 class="backup-power"></h2>
                      </div>
                  </div>
                  <div class="cell"></div>
                  <div class="cell"></div>
              </div>
          </ha-card>
        `;

    this.nodes = {
      content: content,
      battery_soc: content.querySelector(".battery-soc"),
      battery_flow: content.querySelector(".battery-flow"),
      battery_flow_description: content.querySelector(
        ".battery-flow-description"
      ),
      home_consumption: content.querySelector(".home-consumption"),
      grid_flow: content.querySelector(".grid-flow"),
      // grid_flow_description: content.querySelector('.grid-flow-description'),
      pv_power: content.querySelector(".pv-power"),
      pv_power_description: content.querySelector(".pv-power-description"),
      backup_power: content.querySelector(".backup-power"),
      battery_voltage: content.querySelector(".battery-voltage"),
      grid_voltage: content.querySelector(".grid-voltage"),
    };
  }

  _setCssVariable(node, variable, value) {
    node.style.setProperty("--" + variable, value);
  }
}

customElements.define("lux-power-distribution-card", LuxPowerDistributionCard);
