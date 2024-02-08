import * as constants from "./constants.js";

export function generateStyles(config) {
  return `
  /* CARD */
  ha-card {
    width: auto;
  }
  
  /* GRID */
  .diagram-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    grid-template-rows: repeat(${config.pv_power.is_used ? 5 : 4}, 1fr);
    padding-left: 5px;
    padding-right: 5px;
  }
  .status-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(1, 1fr);
    padding-left: 5px;
    padding-right: 5px;
    padding-top: ${config.title ? 0 : 10}px;
  }
  .diagram-grid img {
    max-width: 100%;
    max-height: 100%;
  }
  
  /* CELLS */
  .cell {
    /* border: 1px solid #ccc; */
    width: 100%;
    height: auto;
  }
  
  /* TEXT */
  .text-cell {
    /*max-height: 100%;*/
    display: flex;
    /*text-overflow: ellipsis;
    flex-wrap: wrap;
    word-wrap: break-word;*/ /* Allow the text to wrap within the cell */
  }
  /* .text-cell left {
    justify-content: left;
    text-align: left;
    }
    .text-cell right {
    justify-content: right;
    text-align: right;
    } */
  .header-text {
    font-size: min(4vw, 1em);
    font-weight: bold;
    line-height: 1;
    margin: 0;
    padding-left: 3px;
    padding-right: 3px;
    padding-top: 1.5px;
    padding-bottom: 1.5px;
  }
  .sub-text {
    font-size: min(2.5vw, 0.95em);
    color: var(--secondary-text-color);
    line-height: 1;
    margin: 0;
    padding-left: 3px;
    padding-right: 3px;
    padding-top: 1.5px;
    padding-bottom: 1.5px;
  }
  
  /* IMAGE CELLS */
  .image-cell img {
    margin: auto;
    display: flex;
    align-items: center;
    text-align: center;
    justify-content: center;
    width: auto;
    object-fit: contain;
    position: relative;
  }
  
  .blend-overlay {
    mix-blend-mode: overlay;
  }
  
  /* ARROWS */
  .arrow-cell {
    margin: auto;
    display: flex;
    align-items: center;
  
    text-align: center;
    justify-content: center;
    width: auto;
    object-fit: contain;
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
    animation: arrow-animation-1 1.25s infinite;
  }
  .arrow-2 img {
    animation: arrow-animation-2 1.25s infinite;
  }
  .arrow-3 img {
    animation: arrow-animation-3 1.25s infinite;
  }
  .arrow-4 img {
    animation: arrow-animation-4 1.25s infinite;
  }
  @keyframes arrow-animation-1 {
    0%,
    100% {
      opacity: 1;
    }
    25%,
    50%,
    75% {
      opacity: 0.4;
    }
  }
  @keyframes arrow-animation-2 {
    0%,
    25%,
    50%,
    100% {
      opacity: 0.4;
    }
    75% {
      opacity: 1;
    }
  }
  @keyframes arrow-animation-3 {
    0%,
    25%,
    75%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }
  @keyframes arrow-animation-4 {
    0%,
    25%,
    75%,
    100% {
      opacity: 0.4;
    }
    25% {
      opacity: 1;
    }
  }
  
  /* TIME AND DATE */
  .update-time {
    text-align: left;
    margin: 0;
    line-height: 1;
    padding-left: 5px;
    padding-right: 5px;
  }
  .grid-status {
    text-align: right;
    margin: 0;
    line-height: 1;
  }
  .inv-select {
    align-items: left;
    margin: 0;
    line-height: 1;
  }  
  `;
}

export function generateStatus(config) {
  let text_box_full = ``;
  let status_message_full = ``;

  if (config.inverter_alias.is_used && config.inverter_count > 1) {
    // let text_box_options = `<option value="parallel">Parallel</option>`;
    let text_box_options = ``;
    if (config.parallel.parallel_first) {
      text_box_options += `<option value="${config.inverter_count}">Parallel</option>`;
    }
    for (let i = 0; i < config.inverter_count; i++) {
      text_box_options += `<option value="${i}">${config.inverter_alias.values[i]}</option>`;
    }
    if (!config.parallel.parallel_first) {
      text_box_options += `<option value="${config.inverter_count}">Parallel</option>`;
    }
    text_box_full = `
      <select class="inv-select" name="Inverters" id="inverter-selector">
        ${text_box_options}
      </select>
    `;
  }

  if (config.status_codes.is_used) {
    status_message_full = `Card starting...`;
  }

  return `
    <div id="select-cell" class="cell">
      ${text_box_full}
    </div>
    <div id="status-cell" class="cell grid-status">
      ${status_message_full}
    </div>
  `;
}

export function generateGrid(config) {
  let cells = ``;
  let refresh_button_left = ``;
  let refresh_button_right = ``;

  // Refresh button
  if (config.refresh_button.left) {
    refresh_button_left = `
      <button id="refresh-button-left" class="icon-button">
        <ha-icon icon="mdi:cloud-refresh"></ha-icon>
      </button>
    `;
  }
  if (config.refresh_button.right) {
    refresh_button_right = `
      <button id="refresh-button-right" class="icon-button">
        <ha-icon icon="mdi:cloud-refresh"></ha-icon>
      </button>
    `;
  }

  // Row zero and one
  if (config.pv_power.is_used) {
    // Row 0
    cells += `<div class="cell"></div>`;
    cells += `<div class="cell"></div>`;
    cells += `<div id="solar-image" class="cell image-cell"><img src="${constants.getBase64Data("solar")}"></div>`; // Solar image
    cells += `<div id="solar-info" class="cell text-cell"></div>`; // Solar info
    cells += `<div class="cell"></div>`;
    cells += `<div class="cell"></div>`;
    // Row 1
    cells += `<div id="battery-charge-info" class="cell text-cell"></div>`; // Battery charge/discharge info
    cells += `<div class="cell"></div>`;
    cells += `<div id="solar-arrows" class="cell arrow-cell"></div>`; // Solar arrows
    cells += `<div class="cell"></div>`;
    cells += `<div class="cell"></div>`;
    cells += `<div class="cell">${refresh_button_right}</div>`;
  } else {
    // Row 1
    cells += `<div id="battery-charge-info" class="cell text-cell"></div>`; // Battery charge/discharge info
    cells += `<div class="cell"></div>`;
    cells += `<div class="cell"></div>`;
    cells += `<div class="cell"></div>`;
    cells += `<div class="cell"></div>`;
    cells += `<div class="cell">${refresh_button_right}</div>`;
  }

  // Row 2
  cells += `<div id="battery-image" class="cell image-cell"><img src="${constants.getBase64Data("battery-0")}"></div>`; // Battery image
  cells += `<div id="battery-arrows" class="cell arrow-cell"></div>`; // Battery arrows
  cells += `<div id="inverter-image" class="cell image-cell"><img src="${constants.getBase64Data("inverter")}"></div>`; // Inverter image
  cells += `<div id="grid-arrows-1" class="cell arrow-cell"></div>`; // Grid arrows 1
  cells += `<div id="grid-arrows-2" class="cell arrow-cell"></div>`; // Grid arrows 2
  cells += `<div id="grid-image" class="cell image-cell"><img src="${constants.getBase64Data("grid")}"></div>`; // Grid image

  // Row 3
  cells += `<div id="battery-soc-info" class="cell text-cell"></div>`; // Battery SOC info
  cells += `<div class="cell"></div>`;
  cells += `<div id="home-arrows" class="cell arrow-cell"></div>`; // Home arrows
  cells += `<div class="cell"></div>`;
  cells += `<div class="cell"></div>`;
  cells += `<div id="grid-info" class="cell text-cell"></div>`; // Grid info

  // Row 4
  if (config.energy_allocations.is_used) {
    // Power Allocations
    cells += `<div class="cell">${refresh_button_left}</div>`;
    cells += `<div id="home-info" class="cell text-cell"></div>`; // Home info
    cells += `<div id="home-image" class="cell image-cell"><img src="${constants.getBase64Data("home-normal")}"></div>`; // Home image
    cells += `<div id="power-allocation-arrows" class="cell arrow-cell"></div>`; // Power allocation arrows
    cells += `<div id="power-allocation-image" class="cell image-cell"><img src="${constants.getBase64Data("home-normal")}"></div>`; // Power allocation image
    cells += `<div id="power-allocation-info" class="cell text-cell"></div>`; // Power allocation info
  } else {
    cells += `<div class="cell">${refresh_button_left}</div>`;
    cells += `<div id="home-info" class="cell text-cell"></div>`; // Home info
    cells += `<div id="home-image" class="cell image-cell"><img src="${constants.getBase64Data("home-normal")}"></div>`; // Home image
    cells += `<div class="cell"></div>`;
    cells += `<div class="cell"></div>`;
    cells += `<div class="cell"></div>`;
  }

  return cells;
}

export function generateDateTime(config) {
  let date_time_info = ``;
  if (config.update_time.is_used) {
    date_time_info = `
      <p id="time-info">Last update at: -</p>
    `;
    if (config.update_time.show_last_update) {
      date_time_info += `
        <p id="since-info">-</p>
    `;
    }
  }
  return date_time_info;
}

export function generateArrows() {
  let inner_html = ``;
  for (let i = 1; i < 5; i++) {
    inner_html += `<div class="arrow-${i}"><img src="${constants.getBase64Data("arrow")}"></div>`;
  }
  return inner_html;
}
