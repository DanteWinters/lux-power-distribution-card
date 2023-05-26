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
    } else if (this.card && this.card.firstElementChild.tagName.toLowerCase() == "p") {
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
    // battery_arrow_element.setAttribute("class", `cell arrow-cell arrows-none`);
    // battery_arrow_element.innerHTML = ``;
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
      const arrow_direction = battery_flow < 0 ? "arrows-right" : battery_flow > 0 ? "arrows-left" : "arrows-none";
      if (battery_arrow_element.className != `cell arrow-cell ${arrow_direction}`) {
        if (arrow_direction != "arrows-none") {
          if (battery_arrow_element) {
            battery_arrow_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
            battery_arrow_element.innerHTML = this.generateArrows();
          }
        } else {
          battery_arrow_element.innerHTML = ``;
        }
      }
      // Charge info
      const battery_charge_info_element = this.card.querySelector("#battery-charge-info");
      battery_charge_info_element.innerHTML = `
        <h3>${this.formatPowerStates("battery_flow")}</h3>
        <p>${battery_flow > 0 ? "Battery Charging" : battery_flow < 0 ? "Battery Discharging" : "Idle"}</p>
      `;
    }
    var battery_voltage = "";
    if (this.config.battery_voltage && this.config.battery_voltage.entity) {
      battery_voltage = `${this.getConfigEntityState("battery_voltage")} Vdc`;
    }
    const battery_soc_info_element = this.card.querySelector("#battery-soc-info");
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
      if (solar_arrow_element.className != `cell arrow-cell ${arrow_direction}`) {
        if (arrow_direction != "arrows-none") {
          solar_arrow_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
          solar_arrow_element.innerHTML = this.generateArrows();
        } else {
          solar_arrow_element.setAttribute("class", `cell arrow-cell arrows-none`);
          solar_arrow_element.innerHTML = ``;
        }
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
      const arrow_direction = grid_flow < 0 ? "arrows-left" : grid_flow > 0 ? "arrows-right" : "arrows-none";
      if (grid_arrow_1_element.className != `cell arrow-cell ${arrow_direction}`) {
        if (arrow_direction != "arrows-none") {
          grid_arrow_1_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
          grid_arrow_2_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
          grid_arrow_1_element.innerHTML = this.generateArrows();
          grid_arrow_2_element.innerHTML = this.generateArrows();
        } else {
          grid_arrow_1_element.setAttribute("class", `cell arrow-cell arrows-none`);
          grid_arrow_2_element.setAttribute("class", `cell arrow-cell arrows-none`);
          grid_arrow_2_element.innerHTML = ``;
          grid_arrow_2_element.innerHTML = ``;
        }
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
      const home_consumption = parseInt(this.getConfigEntityState("home_consumption"));
      const arrow_direction = home_consumption > 0 || backup_power > 0 ? "arrows-down" : "arrows-none";
      if (home_arrow_element.className != `cell arrow-cell ${arrow_direction}`) {
        if (arrow_direction != "arrows-none") {
          home_arrow_element.setAttribute("class", `cell arrow-cell ${arrow_direction}`);
          home_arrow_element.innerHTML = this.generateArrows();
        } else {
          home_arrow_element.setAttribute("class", `cell arrow-cell arrows-none`);
          home_arrow_element.innerHTML = ``;
        }
      }
    }
    // Info
    const home_info_element = this.card.querySelector("#home-info");
    if (home_info_element) {
      home_info_element.innerHTML = `
        <h3>${this.formatPowerStates("home_consumption")}</h3>
        <h3>${
          this.config.backup_power && this.config.backup_power.entity ? this.formatPowerStates("backup_power") : ""
        }</h3>
      `;
    }
  }

  updateAllocatedPower() {
    // Arrow
    const power_allocation_arrow_element = this.card.querySelector("#power-allocation-arrows");
    if (power_allocation_arrow_element) {
      if (power_allocation_arrow_element.className != `cell arrow-cell arrows-right`) {
        power_allocation_arrow_element.setAttribute("class", `cell arrow-cell arrows-right`);
        power_allocation_arrow_element.innerHTML = this.generateArrows();
      }

      const power_allocation_info_element = this.card.querySelector("#power-allocation-info");
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
        grid-template-rows: repeat(${this.config.pv_power && this.config.pv_power.entity ? 5 : 4}, 1fr);
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
        margin: auto;
        display: flex;
        align-items: center;
        text-align: center;
        justify-content: center;
        width: auto;
        height: 100%;
        object-fit: contain;
        position: relative;
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
    cells += `<div id="battery-image" class="cell image-cell"><img src="${this.getBase64Data("battery-0")}"></div>`; // Battery image
    cells += `<div id="battery-arrows" class="cell arrow-cell"></div>`; // Battery arrows
    cells += `<div id="inverter-image" class="cell image-cell"><img src="${this.getBase64Data("inverter")}"></div>`; // Inverter image
    cells += `<div id="grid-arrows-1" class="cell arrow-cell"></div>`; // Grid arrows 1
    cells += `<div id="grid-arrows-2" class="cell arrow-cell"></div>`; // Grid arrows 2
    cells += `<div id="grid-image" class="cell image-cell"><img src="${this.getBase64Data("grid")}"></div>`; // Grid image

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
      cells += `<div id="solar-image" class="cell image-cell"><img src="${this.getBase64Data("solar")}"></div>`; // Solar image
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
    if (this.config.energy_allocations && this.config.energy_allocations.entities) {
      // Power Allocations
      cells += `<div class="cell"></div>`;
      cells += `<div id="home-info" class="cell"></div>`; // Home info
      cells += `<div id="home-image" class="cell image-cell"><img src="${this.getBase64Data("home-normal")}"></div>`; // Home image
      cells += `<div id="power-allocation-arrows" class="cell arrow-cell"></div>`; // Power allocation arrows
      cells += `<div id="power-allocation-image" class="cell image-cell"><img src="${this.getBase64Data(
        "home-normal"
      )}"></div>`; // Power allocation image
      cells += `<div id="power-allocation-info" class="cell"></div>`; // Power allocation info
    } else {
      cells += `<div class="cell"></div>`;
      cells += `<div id="home-info" class="cell"></div>`; // Home info
      cells += `<div id="home-image" class="cell image-cell"><img src="${this.getBase64Data("home-normal")}"></div>`; // Home image
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
      cells += `<div class="cell"></div>`;
    }
    return cells;
  }

  generateArrows() {
    var inner_html = ``;
    for (let i = 1; i < 5; i++) {
      inner_html += `<div class="arrow-${i}"><img src="${this.getBase64Data("arrow")}"></div>`;
    }
    return inner_html;
  }

  getBase64Data(image_name) {
    switch (image_name) {
      case "arrow":
        return `data:image/png;base64,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`;
      case "battery-0":
        return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAABZCAYAAABFa8ZzAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAABc1JHQgCuzhzpAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEwAACxMBAJqcGAAAACF0RVh0Q3JlYXRpb24gVGltZQAyMDIzOjA1OjI2IDExOjUzOjI4iO8l5gAAA3BJREFUaEPtm01ME0EUx99AbQtUPhQIGr/QGCGRk4ZEQY+E6AE0Fk9oPBuPoDdELwpHrhqjN9pE5GIMB2MiakL0pCEkRhONFwUUif0EHOeVZ0tLp13ane02nR80+58tzfx2+zq7XXZAoxhGS0P0jA/eZoxfBc5qxSu39FopXPwwvsQ5G5u8ODJEa6UY7rTHNzgt/riDmkrgAK8m+0Y6qZmWMlpmROzZYdWyCPaB7yI102JIWJTBNYrKiZVcBgwJx2rWKrL0ZUzYrA+YEbL0ZUzYRhSd8Kbd7/UNeaI8+FDELvHuVFlaDhsR47P4DYg05WSVl/19w39wdZJMr+/GMc7/vmQMKmiVLRDmIcbKTj3pu/MuLry+Z0M/7Cb7H5SORENN8Rpe4cEHdpVF0M3tdN+PC4vDYjdF24KOcWHGmIeibUHHeA33+gbFBiTTsjMCl9rOwMG6k+ByWLM9kdU/8PnXa3j0/inMLbpobQLpONxavwJDp29Ba0OXZbII9oV9xvoWDqlIhfuPdoPbUU0t68G+0SEVqTCWQaE5tGPzqbFU2MoykOEsr6SUQCpsV7SwarSwakpXeDm8AN9+z2V95Iv0XGLCe5eSMd588cPozAy15Dz2jlIyxjn/dUrrlG5JGDkyHtgeopQ7pgk3epopyTnelP8XmtItCavQwqoxTbjaVU9JjntbDaXcMU/YnV14l+cIpdzRNawaLawaU4XPNi9RUoepwhWOzP+72VvbRil3dA2rRgurxlTh5rp2SuqwdA/vqWmhlDu6hlVT2sJWXAQ3VdjIV/18sawkLhymkCemXVtDIqtBmA98pVYyLkclNFTto5ZxlF5bQykca9M9cpFNR2mPElZgag3jNeJM4Ak8lsdWSK1hU4XP+wcopWegvR1O7PdSyxj6grbVaGHVaGHVFJ1waR84VKAPHFajhVWjhVUjFcabNgtNdC1IKYFUGO8wLTSffk5TSiAVHp+dhPDqMrWsB/tGh1TKaQkt3o6bFGN8DzhhduE57PYwqHY3gaPMSc+oJbIWgI+LL2Ds7T34ML/5hhDpodmuFNcowYHHhTnnhR8WsoATUTbu4Sla2pmpuHAkGr6CkzuoaTvE3g2jY1z4Wf/YMk6fsaN0bGoPlHeiY9KHDuf6OFlFo9icCdHEiUuFJoAu6IRutK6YAPgHz2wMIHipl+AAAAAASUVORK5CYII=`;
      case "battery-1":
        return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAABYCAYAAABs6w6vAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAABc1JHQgCuzhzpAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEwAACxMBAJqcGAAAACF0RVh0Q3JlYXRpb24gVGltZQAyMDIzOjA1OjI2IDExOjUzOjQzSWdb6AAAA1RJREFUaEPtm09IVEEcx3+zrs9VF+mvSLeUQKO6dIm0CAyRsLRA62LROSKokCDCLIiSCmKvSdRJt4MZESERQRYFdYjCAtF7phayu7qrNs1vHN3cnfWt1sybjfkovplZl9/H93773tfDgEURRBxdaexpu0oIPQWUrGHvyvp9y0LZF6E/KSWhvqOd7WI1I1kVbQy3DbBfrBZTJVCA130tnTViKsUnjhlhZ7RDtSiCNfDqiakUV1l26U+LoXJ4my2DqyzvUV241HKX/VcfpmxwqeUuaxA5JbvktDeH24MJGrvPhnXsihRrbYE/Yfdf9h1lo36HFJ142NIRweVFmabwhZ2U/npFCBSKJSNg1lOE+PY8arn+gcvOn9GpUdNEF0DheGKqjPfsDI3dM1UUQbeAE+jisuxRV89XDQYduSwhJMhXDAYdec82hduY+FIq18fh+PYDUL52NxT49fwt8dkIjPx4Aw8+PYWv4wViNYn0Plu1YQba916Bqo112kQRrIU1eW3mkIpUtnVbPQT8JWKmH6yNDqlIZfHSe03FuvRoK5XVeekz4eQViVESqSw2utck5mJilEQqi59IrxmeGBCjJFLZnsE+mJ6dFDP9YG10SCUPf1Q2V1/mM8G3qAODYy9gE7sNlwTKwO9zxCtqic9FYWj8JYTe34XP39Of/hkfCiYibQNTsbKqyClZm7pWi01dOrCpSxU2danApi7dSNvAVKysKnJK1qau1WJTlw5s6lKFTV0qsKlLN9I2MBUrq4qckrWpa7XY1KUDm7pUYVOXCmzq0o20DUzFyqri/5DF1HVtXy0f9zbf0HLsPnyJ18TaMqR3A0w853adgecjN6F7MP2xp4pggR8aKiZhf/l5uPX2DnwZyxevzCM9s5h4dIsikfgsr4m1V5S6ngx7FxEfDwWlqSv3HwrY6Ng/XlGU74OeI+m7V6SymLqw0b3i0JbIylJX7eazcGxrDIodnnW0gTWxtix1SWU/jgbh9rsQ7Cg9CF0NF/latvfKvz1iTayNDqnY1KUECpTLUkq9/6fLBdxksXBm+8XRZPq5bDwxfRI3LvAlA2FndRodueyz1tAkbgkxUZhvV4G8GnRc/IDh3hWHFJayP6OXTXETjtdE0QWd0A0A4DcfP92SVeLRqAAAAABJRU5ErkJggg==`;
      case "battery-2":
        return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAABYCAYAAABs6w6vAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAABc1JHQgCuzhzpAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEwAACxMBAJqcGAAAACF0RVh0Q3JlYXRpb24gVGltZQAyMDIzOjA1OjI2IDExOjUzOjU1uR/PnAAAA1RJREFUaEPtm09IVEEcx3+zrs9VF+mvSLeUQKO6dIm0CAyRsLRA62LROSKokCDCLIiSCmKvSdRJt4MZESERQRYFdYjCAtF7phWyu7qrNs1vHN3cnfWt1syblfkovplZl99n581774s4YFEEEUdXGnvarhJCTwEla9i7sn7fklD2RegvSkmo72hnuxjNSFZFG8NtA+wXq0VXCRTgdV9LZ43oSvGJY0bYjHaoFkWwBp490ZXiKstO/WnRVA5fZkvgKsvXqC5carnL/q+LKRtcarnLGkROyS6a9uZwezBBY/dZs46dkWKtS+Bv2P2XfUdZq98hRScetnREcHhBpil8YSelv18RAoViyAiY9SQhvj2PWq5/4LJzMzo5aproPCgcT0yW8TU7TWP3TBVF0C3gBLq4LHvU1fNRg0FHLksICfIRg0FHvmabwm1MfDGV6+NwfPsBKF+7Gwr8ej5LfCYCIz/fwINPT+HreIEYTSK9z1ZtmIb2vVegamOdNlEEa2FNXps5pCKVbd1WDwF/iejpB2ujQypSWTz1XlOxLj3aSmV1nvpMOHlFopVEKosL3WsSszHRSiKVxSvSa4Z/DIhWEqlsz2AfTM1MiJ5+sDY6pJKHPyqbqy/znuBb1IHBsRewid2GSwJl4Pc54hW1xGejMDT+EkLv78Ln7+lP/4wPBRORLgNTsbKqyClZm7pWik1dOrCpSxU2danApi7dSJeBqVhZVeSUrE1dK8WmLh3Y1KUKm7pUYFOXbqTLwFSsrCpWhyymrmv7anm7t/mGlmP34Uu8JtaWIb0bYOI5t+sMPB+5Cd2D6Y89VQQL/NBQMQH7y8/Drbd34MtYvnhlDunMYuLRLYpE4jO8JtZeVup6MuxdRHw8FJSmrtx/KOBCx/XjFUX5Pug5kv5/lFJZTF240L3i0JbI8lJX7eazcGxrDIodnnW0gTWxtix1SWU/jgbh9rsQ7Cg9CF0NF/lYtvfKfz1iTayNDqnY1KUKK6uK1SFrU5cLNnWpxqYuVdjUpQKburxAOrNGQoFyWUqp93/qdgE3WczPbL84mkw/l40npk7ixgU+ZCBsVqfQkcs+aw1N4JYQE4X5dhXIq0HHhQsM9644pLCUfYxe1sVNOF4TRRd0QjcAgD8ddw7upi+WuQAAAABJRU5ErkJggg==`;
      case "battery-3":
        return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAABYCAYAAABs6w6vAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAABc1JHQgCuzhzpAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEwAACxMBAJqcGAAAACF0RVh0Q3JlYXRpb24gVGltZQAyMDIzOjA1OjI2IDExOjU0OjA2wLZS2gAAA1VJREFUaEPtm09IVEEcx3+zrm/XdZH+inRLCTSqS5dIi8AQCUsLtC4WnSOCiiWIMAuipILYaxJ10u1gGxEhEUEWBXWIwgLRe6YWsrvurto0v3F0c3fWt1bz3ijzUXwzsy6/z86b994XdMCgCCKOtjT3hq4SQk8BJWvYuwp+35JQ9kXoT0pJOHq0q0OM5qWgos2R0AD7xVrRVQIFeB1t66oTXSkeccwLm9FO1aII1sCzJ7pSbGXZqT8tmsrhy2wJbGX5GnUKm1r2sv/rYioEm1r2shqxomQXTXtrpCOYpon7rNnAzkipo0vgT9j9l33HWavfIoETD9s6Yzi8INMSubCT0l+vCIESMaQFzHqKEM+eR23XP3DZuRmdGtVNdB4UTqWnKvianaaJe7qKIujmt/zdXJY96hr5qMagI5clhAT5iMagI1+zLZEQE19M9foUHN9+ACrX7gaf15nPkpqJwciPN/Dg01P4Ou4Toxmk99maDdPQsfcK1GxscEwUwVpYk9dmDtlIZdu3NYLfWyZ6zoO10SEbqSyeerepWpcbbaWyTp76fFhFAdHKIJXFhe426dmEaGWQyuIV6TbDEwOilUEq2zsYheTMpOg5D9ZGh2yK8Ed1a+1l3hN8i1swOPYCNrHbcJm/ArweS7yiltRsHIbGX0L4/V34/D336Z/3oaAj0mWgK0ZWFStK1qSuv8WkLicwqUsVJnWpwKQup5EuA10xsqpYHbKYuq7tq+ftvtYbjhx7Dl/iNbG2DOndABPPuV1n4PnITegZzH3sqSLo80JT1STsrzwPt97egS9jxeKVOaQzi4nHaVEklprhNbH2slLXk2H3IuLjoaA0da38hwIudFw/bhEo9kDvkdy/6EtlMXXhQneLQ1tiy0td9ZvPwrGtCSi1eNZxDKyJtWWpSyr7cTQIt9+FYUf5QehuusjHCr1X/usRa2JtdMjGpC5VGFlVrA5Zk7psMKlLNSZ1qcKkLhWY1OUG0pnVFSOritUha1KXDSZ1qcakLlWY1KUCk7rcQDqzWkKBcllKqfv/YGADbrKYn9l+cdSZfi6bSidP4sYFPqQhbFaT6Mhln7WHJ3FLiI7CfLsKFNWh48IFhntXLFJSzj5GH+viJhy3iaMLOqEbAMBvpXtAO8i6YdgAAAAASUVORK5CYII=`;
      case "battery-4":
        return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAABYCAYAAABs6w6vAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAABc1JHQgCuzhzpAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEwAACxMBAJqcGAAAACF0RVh0Q3JlYXRpb24gVGltZQAyMDIzOjA1OjI2IDExOjU0OjE5SRJ+CgAAA1NJREFUaEPtm09IVEEcx3+zu75ddZH+inRLCTSqS5dIi8AQCUsLtC4WnSOCCgkizIIoqSD2mkSddDuYERESEWRRUIcoLBC9Z1qx7H+1aX7j6OburG+l5r1xmY/im5l1+X123rz3vogDBkUQcbSldaDrKiH0FFCyhr2r4PctC2VfhP6ilISGjvZ2i9G8FFS0Ndw1wn6xXnSVQAFeD3X0NoiuFI845oXNaI9qUQRr4NkTXSm2suzUnxZN5fBltgy2snyNOoVNLXvZ/3UxFYJNLXtZjVhVskumvT3cHUzT+H3WbGJnpNzRJfA37P7LvmOsNWyRshMPO3qiOLwo0xa+sJPS368IgVIxpAXMOkGIZ8+jjusfuOz8jCYmdRNdAIVT6UQVX7MzNH5PV1EE3QJWoI/LskddMx/VGHTksoSQIB/RGHTka7Yt3MXEl1K7PgXHtx+A6rW7we9z5rOkZqMw8fMNPPj0FL5O+8VoBul9tm7DDHTvvQJ1G5scE0WwFtbktZlDNlLZzm3NEPBViJ7zYG10yEYqi6febWrW5UZbqayTpz4flrdMtDJIZXGhu016Li5aGaSyeEW6zfiPEdHKIJUdGB2C5GxE9JwHa6NDNl78Udtef5n3BN9iFoxOvYBN7DZcEagCn8cSr6glNReDsemXEHp/Fz5/z336530o6Ih0GeiKkVVFcchi6rq2r5G3B9tvOHLsP3yJ18TaMqR3A0w853adgecTN6F/NPexp4qg3wctNRHYX30ebr29A1+mSsQr80hnFhOP06JINDXLa2LtFaWuJ+PuRcTHY0Fp6lr9DwVc6Lh+3KKsxAMDR3L/tiyVxdSFC90tDm2Jrix1NW4+C8e2xqHc4lnHMbAm1palLqnsx8kg3H4Xgh2VB6Gv5SIfK/Re+a9HrIm10SEbk7pUYWRVURyyJnXZYFKXakzqUoVJXSowqcsNpDOrK0ZWFcUha1KXDSZ1qcakLlWY1KUCk7rcQDqzumJkVVEcsiZ12WBSl2pM6lKFSV0qMKnLDaQzqyUUKJellLr/b5024CaLhZkdFkedGeayqXTyJG5c4EMawmY1iY5c9llnKIJbQnQU5ttVwNuAjosXGO5dsUhpJfsYg6yLm3DcJoYu6IRuAAB/ALdacYgUQMv0AAAAAElFTkSuQmCC`;
      case "battery-5":
        return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAABYCAYAAABs6w6vAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAABc1JHQgCuzhzpAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEwAACxMBAJqcGAAAACF0RVh0Q3JlYXRpb24gVGltZQAyMDIzOjA1OjI2IDExOjU0OjMzm/H1lgAAAsZJREFUaEPtm89LlEEYx59Zc9P1JfqFdE0JKqJLl0iDwAgPlha4dZHoHBFULIGESCAlFcSeJbq528E2OsTSLYs6dOhih9A/QKJC1l13jaZ5xlFrnXUW6nnfcXk+K7zvzLo8H5933tfvHgYYIoQ5OunPpO4KIa+CFDvVp+r+3KZI9RLyh5Qinbs4PmJma1JX0f5salr9YpcZkiAB3uaS491maCVmjjVRHR2lFkWwBl49M7TilFWX/po5JUcvs01wyuo1GhaOWm7Z/3Uz1YOjllvWI7aU7F9tH8yOBBVZfKpOz6gr0hbqEvgT9fxVP4vqLB8XicvPkqMFnF6TGcjePiblrzdCQKuZ8gJlXRIidvJ58t5HLbvS0dK8b6KroHC5Utqn1+yyLD7xVRRBt5Z4y4SWVf/qevWsx6CjlhVCBHrGY9Cx5qPr4J4yjJ3q0edTg/dDOU6ev6NrYm0b+gYbyKZUl9c5tHcZbh6/Dq/nHsDkTMLM0hNs3wZ9nQtwuuMWPHz/GD5/bTbvrGDt7NCR3tBFkUL5p66JtdGhGqtsx64T8HJ2hxmFz4svAXTu3hhtrcvAV6ydxYWO6ycqEs0xyFzY+C3HKjv3/Z1e6FFx7kABZr9Nm9E6VtnMTA569t+AS4eL0BZvMrPhgDWxNjpUY5X9NB/Aow9pONp+Fib6hvVcvc/Kfz1iTayNDtVs/RvMV1iWisaQ5dTlgFMXNZy6qODURQGnriiwdtZXWJaKxpDl1OWAUxc1nLqo4NRFAaeuKLB21ldYlorGkOXU5YBTFzWcuqjg1EUBp64osHbWV1iWisaQ5dTlgFMXNZy6qODURQGnriiwdtZLJEgtK6XUmxZ8BjdZrHY2b44+k9ey5crSFdy4oKc8RHV1CR217Kuh9AJuCfFRWG9XgaZudFy7wXDvSly0tqs/Y0oNcRNO1CyiCzqhGwDAb1MUotWDpWaqAAAAAElFTkSuQmCC`;
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
    for (let i = 0; i < this.config["energy_allocations"].entities.length; i++) {
      let entity = this._hass.states[this.config["energy_allocations"].entities[i]];
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
