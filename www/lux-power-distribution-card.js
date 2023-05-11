class LuxPowerDistributionCard extends HTMLElement {
  set hass(hass) {
    this._hass = hass;

    if (!this.card) {
      this.createCard();
    }

    this.updateCard();
  }

  setConfig(config) {
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
    this.config = JSON.parse(JSON.stringify(config));
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

    content.innerHTML = `
      <ha-card>
        <div class="diagram-grid">
        </div>
      </ha-card>
    `;

    this.nodes = {
      content: content,
    };

    this.generateStyles();
    this.generateGrid();
  }

  updateCard() {
    if (
      this._hass.states[this.config["battery_soc"].entity] == undefined ||
      this._hass.states[this.config["battery_flow"].entity] == undefined ||
      this._hass.states[this.config["home_consumption"].entity] == undefined ||
      this._hass.states[this.config["grid_flow"].entity] == undefined
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
      this.createCard();
    }
    this.updateStates();
  }

  updateStates() {
    this.updateBattery();
    this.updateSolar();
    this.updateGrid();
    this.updateHome();
    this.updateAllocatedPower();
  }

  updateBattery() {
    const battery_arrow_element = this.card.querySelector("#battery-arrows");
    battery_arrow_element.setAttribute("class", `cell arrow-cell arrows-none`);
    battery_arrow_element.innerHTML = ``;
    const battery_soc = this.getConfigEntityState("battery_soc");
    // Image
    const battery_image_element = this.card.querySelector("#battery-image");
    if (battery_image_element) {
      battery_image_element.innerHTML = `<img src="${this.getBase64Data(
        this.getBatteryLevel(parseInt(battery_soc))
      )}">`;
    }
    if (this.config.battery_flow && this.config.battery_flow.entity) {
      // Arrow
      const battery_flow = this.getConfigEntityState("battery_flow");
      const arrow_direction =
        battery_flow < 0
          ? "arrows-right"
          : battery_flow > 0
          ? "arrows-left"
          : "arrows-none";
      if (arrow_direction != "arrows-none") {
        if (battery_arrow_element) {
          battery_arrow_element.setAttribute(
            "class",
            `cell arrow-cell ${arrow_direction}`
          );
          battery_arrow_element.innerHTML = this.generateArrows();
        }
      }
      // Charge info
      const battery_charge_info_element = this.card.querySelector(
        "#battery-charge-info"
      );
      battery_charge_info_element.innerHTML = `
        <h3>${this.formatPowerStates("battery_flow")}</h3>
        <p>${
          battery_flow > 0
            ? "Battery Charging"
            : battery_flow < 0
            ? "Battery Discharging"
            : "Idle"
        }</p>
      `;
    }
    var battery_voltage = "";
    if (this.config.battery_voltage && this.config.battery_voltage.entity) {
      battery_voltage = `${this.getConfigEntityState("battery_voltage")} Vdc`;
    }
    const battery_soc_info_element =
      this.card.querySelector("#battery-soc-info");
    if (battery_soc_info_element) {
      battery_soc_info_element.innerHTML = `
        <h3>${battery_soc}%</h3>
        <h3>${battery_voltage}</h3>
    `;
    }
  }

  updateSolar() {
    const solar_arrow_element = this.card.querySelector("#solar-arrows");
    const solar_info_element = this.card.querySelector("#solar-info");
    if (solar_arrow_element && solar_info_element) {
      // Arrow
      const pv_power = parseInt(this.getConfigEntityState("pv_power"));
      const arrow_direction = pv_power > 0 ? "arrows-down" : "arrows-none";
      if (arrow_direction != "arrows-none") {
        solar_arrow_element.setAttribute(
          "class",
          `cell arrow-cell ${arrow_direction}`
        );
        solar_arrow_element.innerHTML = this.generateArrows();
      } else {
        solar_arrow_element.setAttribute(
          "class",
          `cell arrow-cell arrows-none`
        );
        solar_arrow_element.innerHTML = ``;
      }
      // Info
      solar_info_element.innerHTML = `
        <h3>${this.formatPowerStates("pv_power")}</h3>
        <p>${pv_power > 0 ? "Solar Import" : ""}</p>
      `;
    }
  }

  updateGrid() {
    // Arrow
    const grid_arrow_1_element = this.card.querySelector("#grid-arrows-1");
    const grid_arrow_2_element = this.card.querySelector("#grid-arrows-2");
    if (grid_arrow_1_element && grid_arrow_2_element) {
      const grid_flow = parseInt(this.getConfigEntityState("grid_flow"));
      const arrow_direction =
        grid_flow < 0
          ? "arrows-left"
          : grid_flow > 0
          ? "arrows-right"
          : "arrows-none";
      if (arrow_direction != "arrows-none") {
        grid_arrow_1_element.setAttribute(
          "class",
          `cell arrow-cell ${arrow_direction}`
        );
        grid_arrow_2_element.setAttribute(
          "class",
          `cell arrow-cell ${arrow_direction}`
        );
        grid_arrow_1_element.innerHTML = this.generateArrows();
        grid_arrow_2_element.innerHTML = this.generateArrows();
      } else {
        grid_arrow_1_element.setAttribute(
          "class",
          `cell arrow-cell arrows-none`
        );
        grid_arrow_2_element.setAttribute(
          "class",
          `cell arrow-cell arrows-none`
        );
        grid_arrow_2_element.innerHTML = ``;
        grid_arrow_2_element.innerHTML = ``;
      }
    }
    // Info
    const grid_info_element = this.card.querySelector("#grid-info");
    if (grid_info_element) {
      grid_info_element.innerHTML = `
        <h3>${this.formatPowerStates("grid_flow")}</h3>
        <h3>${
          this.config.grid_voltage && this.config.grid_voltage.entity
            ? `${this.getConfigEntityState("grid_voltage")} Vac`
            : ""
        }</h3>
      `;
    }
  }

  updateHome() {
    // Arrow
    const home_arrow_element = this.card.querySelector("#home-arrows");
    if (home_arrow_element) {
      const backup_power =
        this.config.backup_power && this.config.backup_power.entity
          ? parseInt(this.getConfigEntityState("backup_power"))
          : 0;
      const home_consumption = parseInt(
        this.getConfigEntityState("home_consumption")
      );
      const arrow_direction =
        home_consumption > 0 || backup_power > 0
          ? "arrows-down"
          : "arrows-none";
      if (arrow_direction != "arrows-none") {
        home_arrow_element.setAttribute(
          "class",
          `cell arrow-cell ${arrow_direction}`
        );
        home_arrow_element.innerHTML = this.generateArrows();
      } else {
        home_arrow_element.setAttribute("class", `cell arrow-cell arrows-none`);
        home_arrow_element.innerHTML = ``;
      }
    }
    // Info
    const home_info_element = this.card.querySelector("#home-info");
    if (home_info_element) {
      home_info_element.innerHTML = `
        <h3>${this.formatPowerStates("home_consumption")}</h3>
        <h3>${
          this.config.backup_power && this.config.backup_power.entity
            ? this.formatPowerStates("backup_power")
            : ""
        }</h3>
      `;
    }
  }

  updateAllocatedPower() {
    // Arrow
    const power_allocation_arrow_element = this.card.querySelector(
      "#power-allocation-arrows"
    );
    if (power_allocation_arrow_element) {
      power_allocation_arrow_element.setAttribute(
        "class",
        `cell arrow-cell arrows-right`
      );
      power_allocation_arrow_element.innerHTML = this.generateArrows();

      const power_allocation_info_element = this.card.querySelector(
        "#power-allocation-info"
      );
      power_allocation_info_element.innerHTML = `
        <p>Allocated Power</p>
        <h3>${parseInt(this.getAllocatedPower())} W</h3>
      `;
    }
  }

  generateStyles() {
    this.styles.innerHTML = `
      /* CARD */
      ha-card {
        width: auto;
      }

      /* GRID */
      .diagram-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        grid-template-rows: repeat(${
          this.config.pv_power && this.config.pv_power.entity ? 5 : 4
        }, 1fr);
      }
      .diagram-grid img {
        max-width: 100%;
        height: auto;
      }

      /* CELLS */
      .cell {
        /* border: 1px solid #ccc; */
        width: 100%;
        height: auto;
      }
      
      /* IMAGE CELLS */
      .image-cell img {
        display: flex;
        align-items: center;
        justify-content: center;
        /* width: auto;
        height: 100%; */
        object-fit: contain;
      }

      /* ARROWS */
      .arrow-cell {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
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

      /* ARROW ANIMATIONS*/
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
        0%, 100% {opacity: 1;}
        25%, 50%, 75% {opacity: 0.4;}
      }
      @keyframes arrow-animation-2 {
        0%, 25%, 50%, 100% {opacity: 0.4;}
        75% {opacity: 1;}
      }
      @keyframes arrow-animation-3 {
        0%, 25%, 75%, 100% {opacity: 0.4;}
        50% {opacity: 1;}
      }
      @keyframes arrow-animation-4 {
        0%, 25%, 75%, 100% {opacity: 0.4;}
        25% {opacity: 1;}
      }
    `;
  }

  generateGrid() {
    this.generateCells();
  }

  generateCells() {
    var cells = ``;

    // Row 1
    cells += this.generateSolarCells();

    // Row 2
    cells += `<div id="battery-image" class="cell image-cell"><img src="${this.getBase64Data(
      "battery-0"
    )}"></div>`; // Battery image
    cells += `<div id="battery-arrows" class="cell arrow-cell"></div>`; // Battery arrows
    cells += `<div id="inverter-image" class="cell image-cell"><img src="${this.getBase64Data(
      "inverter"
    )}"></div>`; // Inverter image
    cells += `<div id="grid-arrows-1" class="cell arrow-cell"></div>`; // Grid arrows 1
    cells += `<div id="grid-arrows-2" class="cell arrow-cell"></div>`; // Grid arrows 2
    cells += `<div id="grid-image" class="cell image-cell"><img src="${this.getBase64Data(
      "grid"
    )}"></div>`; // Grid image

    // Row 3
    cells += `<div id="battery-soc-info" class="cell"></div>`; // Battery SOC info
    cells += `<div class="cell"></div>`;
    cells += `<div id="home-arrows" class="cell arrow-cell"></div>`; // Home arrows
    cells += `<div class="cell"></div>`;
    cells += `<div class="cell"></div>`;
    cells += `<div id="grid-info" class="cell"></div>`; // Grid info

    // Row 4
    cells += this.generateHomeCells();

    const grid = this.card.getElementsByClassName("diagram-grid");
    grid[0].innerHTML = cells;
  }

  generateSolarCells() {
    var cells = ``;
    if (this.config.pv_power && this.config.pv_power.entity) {
      // Row 0
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
      cells += `<div id="solar-image" class="cell image-cell"><img src="${this.getBase64Data(
        "solar"
      )}"></div>`; // Solar image
      cells += `<div id="solar-info" class="cell"></div>`; // Solar info
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
      // Row 1
      cells += `<div id="battery-charge-info" class="cell"></div>`; // Battery charge/discharge info
      cells += `<div class="cell"></div>`;
      cells += `<div id="solar-arrows" class="cell arrow-cell"></div>`; // Solar arrows
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
    } else {
      // Row 1
      cells += `<div id="battery-charge-info" class="cell"></div>`; // Battery charge/discharge info
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
    }
    return cells;
  }

  generateHomeCells() {
    var cells = ``;
    if (
      this.config.energy_allocations &&
      this.config.energy_allocations.entities
    ) {
      // Power Allocations
      cells += `<div class="cell"></div>`;
      cells += `<div id="home-info" class="cell"></div>`; // Home info
      cells += `<div id="home-image" class="cell image-cell"><img src="${this.getBase64Data(
        "home-normal"
      )}"></div>`; // Home image
      cells += `<div id="power-allocation-arrows" class="cell arrow-cell"></div>`; // Power allocation arrows
      cells += `<div id="power-allocation-image" class="cell image-cell"><img src="${this.getBase64Data(
        "home-normal"
      )}"></div>`; // Power allocation image
      cells += `<div id="power-allocation-info" class="cell"></div>`; // Power allocation info
    } else {
      cells += `<div class="cell"></div>`;
      cells += `<div id="home-info" class="cell"></div>`; // Home info
      cells += `<div id="home-image" class="cell image-cell"><img src="${this.getBase64Data(
        "home-normal"
      )}"></div>`; // Home image
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
    }
    return cells;
  }

  generateArrows() {
    var inner_html = ``;
    for (let i = 1; i < 5; i++) {
      inner_html += `<div class="arrow-${i}"><img src="${this.getBase64Data(
        "arrow"
      )}"></div>`;
    }
    return inner_html;
  }

  getBase64Data(image_name) {
    switch (image_name) {
      case "arrow":
        return `data:image/png;base64,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`;
      case "battery-0":
        return `data:image/png;base64,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`;
      case "battery-1":
        return `data:image/png;base64,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`;
      case "battery-2":
        return `data:image/png;base64,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`;
      case "battery-3":
        return `data:image/png;base64,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`;
      case "battery-4":
        return `data:image/png;base64,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`;
      case "battery-5":
        return `data:image/png;base64,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`;
      case "grid":
        return `data:image/png;base64,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`;
      case "home-normal":
        return `data:image/png;base64,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`;
      case "inverter":
        return `data:image/png;base64,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`;
      case "solar":
        return `data:image/png;base64,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`;
      default:
        return ``;
    }
  }

  getBatteryLevel(battery_soc) {
    if (battery_soc == 100) {
      return "battery-5";
    } else if (battery_soc >= 80) {
      return "battery-4";
    } else if (battery_soc >= 60) {
      return "battery-3";
    } else if (battery_soc >= 40) {
      return "battery-2";
    } else if (battery_soc >= 20) {
      return "battery-1";
    } else {
      return "battery-0";
    }
  }

  getConfigEntityState(config_entity) {
    const entity = this._hass.states[this.config[config_entity].entity];

    if (isNaN(entity.state)) return "-"; //check if entity state is NaN
    else return entity.state;
  }

  getConfigEntityUnit(config_entity) {
    const entity = this._hass.states[this.config[config_entity].entity];

    if (isNaN(entity.state)) return "-"; //check if entity state is NaN
    else return entity.attributes.unit_of_measurement ?? "";
  }

  getAllocatedPower() {
    let allocatedEnergy = 0;
    for (
      let i = 0;
      i < this.config["energy_allocations"].entities.length;
      i++
    ) {
      let entity =
        this._hass.states[this.config["energy_allocations"].entities[i]];
      let entity_value = entity.state;
      let entity_unit = entity.attributes.unit_of_measurement;
      if (entity_unit == "W") {
        allocatedEnergy += parseFloat(entity_value);
      } else if (entity_unit == "kW") {
        allocatedEnergy += parseFloat(entity_value) * 1000;
      }
    }
    return allocatedEnergy;
  }

  formatPowerStates(config_entity) {
    const unit = this.getConfigEntityUnit(config_entity);
    var state = this.getConfigEntityState(config_entity);
    if (unit == "W") {
      return `${Math.abs(parseInt(state))} ${unit}`;
    } else if (unit == "kW") {
      return `${Math.abs(parseInt(state)) * 1000} W`;
    }
  }
}

customElements.define("lux-power-distribution-card", LuxPowerDistributionCard);
