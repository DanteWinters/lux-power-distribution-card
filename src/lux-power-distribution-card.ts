import { LitElement, html, nothing, PropertyValues, TemplateResult } from 'lit';
import { property, customElement, state } from 'lit/decorators.js';

import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from './lib/types';

import { LuxCardConfig, validateConfig } from './config';
import {
  CARD_NAME,
  EDITOR_NAME,
  getBase64Data,
  base64Images,
  getBatteryImage,
  ARROW_NONE,
  ARROW_LEFT,
  ARROW_RIGHT,
  ARROW_DOWN,
  getStatusMessage,
  statusLevels,
  StatusMessageType,
  CARD_FULL_NAME,
} from './const';
import { afterNextRender } from './lib/render-status';
import { mdiTheater } from '@mdi/js';

@customElement(CARD_NAME)
class LuxPowerDistributionCard extends LitElement implements LovelaceCard {
  constructor() {
    super();
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() public _config?: LuxCardConfig;
  @state() private _updated = false;
  @state() private _index = 0;

  private _interval?: number;

  public getCardSize(): number {
    return 4;
  }

  connectedCallback() {
    super.connectedCallback();
    this._updateState();
    this._interval = setInterval(() => this._updateState(), 500);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._interval) clearInterval(this._interval);
  }

  // public static async getConfigElement(): Promise<LovelaceCardEditor> {
  //   await import('./editor');
  //   return document.createElement(EDITOR_NAME) as LovelaceCardEditor;
  // }

  public static async getStubConfig(): Promise<LuxCardConfig> {
    return {
      type: `custom:${CARD_NAME}`,
      inverter_count: 1,
      battery: {
        soc_entities: [],
      },
      grid: {
        flow_entities: [],
      },
      consumption: {
        home_entities: [],
      },
    };
  }

  setConfig(config: LuxCardConfig): void {
    validateConfig(config);
    this._config = config;
    this._updated = false;
  }

  protected willUpdate(_changedProperties: PropertyValues): void {
    super.willUpdate(_changedProperties);
    if (!this._config) return;
    this._updated = false;
  }

  private _update() {
    this.getIndex();
    this.requestUpdate();
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    afterNextRender(() => {
      this._updated = true;
    });

    const history_graph = [
      '#solar-image',
      '#solar-info',
      '#battery-charge-info',
      '#temp-info',
      '#battery-image',
      '#battery-soc-info',
      '#home-info',
      '#home-image',
      '#grid-image',
      '#grid-info',
      '#power-allocation-image',
    ];
    history_graph.forEach((name) => {
      const element = this.renderRoot.querySelector(name) as HTMLElement;
      if (element) {
        element.addEventListener('click', () => this._selectHistory(name));
      }
    });
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (!this._config || !this.hass || !this._updateState) return;
  }

  private _updateState() {
    this._update();
  }

  _handleRefresh() {
    if (this._config?.refresh?.lux_dongles) {
      if (this._index == -1) {
        for (let i = 0; i < this._config.inverter_count; i++) {
          (this.hass as any).callService('luxpower', 'luxpower_refresh_registers', {
            dongle: this._config.refresh.lux_dongles[i],
          });
        }
      } else {
        (this.hass as any).callService('luxpower', 'luxpower_refresh_registers', {
          dongle: this._config.refresh.lux_dongles[this._index],
        });
      }
    }
    this._update();
  }

  _selectHistory(source: string) {
    switch (source) {
      case '#solar-image':
      case '#solar-info':
        if (this._index == -1) {
          if (this._config?.pv?.combined_parallel_entity) {
            this._openHistory(this._config.pv.combined_parallel_entity);
          }
        } else {
          if (this._config?.pv?.combined_entities) {
            this._openHistory(this._config.pv.combined_entities[this._index]);
          } else if (
            this._config?.pv?.array_1_entities ||
            this._config?.pv?.array_2_entities ||
            this._config?.pv?.array_3_entities
          ) {
            let solar_array_list: string[] = [];
            if (this._config?.pv?.array_1_entities) {
              solar_array_list.push(this._config?.pv?.array_1_entities[this._index]);
            }
            if (this._config?.pv?.array_2_entities) {
              solar_array_list.push(this._config?.pv?.array_2_entities[this._index]);
            }
            if (this._config?.pv?.array_3_entities) {
              solar_array_list.push(this._config?.pv?.array_3_entities[this._index]);
            }
            this._openHistoryMulti(solar_array_list);
          }
        }
        break;
      case '#temp-info':
        if (this._config?.temp?.entities) {
          if (this._index == -1) {
            this._openHistoryMulti(this._config.temp.entities);
          } else {
            this._openHistory(this._config.temp.entities[this._index]);
          }
        }
        break;
      case '#home-info':
      case '#home-image':
        if (this._index == -1) {
          if (this._config?.consumption?.combined_consumption_entity) {
            this._openHistory(this._config.consumption.combined_consumption_entity);
          }
        } else {
          let consumption_list: string[] = [];
          if (this._config?.consumption.home_entities) {
            consumption_list.push(this._config.consumption.home_entities[this._index]);
          }
          if (this._config?.consumption.backup_entities) {
            consumption_list.push(this._config.consumption.backup_entities[this._index]);
          }
          this._openHistoryMulti(consumption_list);
        }
        break;
      case '#battery-charge-info':
        if (this._index == -1) {
          if (this._config?.battery.parallel_flow_entity) {
            this._openHistory(this._config.battery.parallel_flow_entity);
          }
        } else {
          if (this._config?.battery.flow_entities) {
            this._openHistory(this._config.battery.flow_entities[this._index]);
          } else if (this._config?.battery.charge_live_entities && this._config?.battery.discharge_live_entities) {
            this._openHistoryMulti([
              this._config.battery.charge_live_entities[this._index],
              this._config.battery.discharge_live_entities[this._index],
            ]);
          }
        }
        break;
      case '#battery-image':
        if (this._index == -1) {
          if (this._config?.battery.parallel_soc_entity) {
            this._openHistory(this._config.battery.parallel_soc_entity);
          }
        } else {
          if (this._config?.battery.soc_entities) {
            this._openHistory(this._config.battery.soc_entities[this._index]);
          }
        }
        break;
      case '#battery-soc-info':
        if (this._index != -1) {
          if (this._config?.battery.voltage_entities) {
            this._openHistory(this._config.battery.voltage_entities[this._index]);
          }
        }
        break;
      case '#grid-image':
        if (this._index == -1) {
          if (this._config?.grid.parallel_flow_entity) {
            this._openHistory(this._config.grid.parallel_flow_entity);
          }
        } else {
          let grid_list: string[] = [];
          if (this._config?.grid.flow_entities) {
            grid_list.push(this._config.grid.flow_entities[this._index]);
          }
          if (this._config?.grid.generator_power_entities) {
            grid_list.push(this._config.grid.generator_power_entities[this._index]);
          }
          this._openHistoryMulti(grid_list);
        }
        break;
      case '#grid-info':
        if (this._index != -1) {
          let grid_list: string[] = [];
          if (this._config?.grid.voltage_entities) {
            grid_list.push(this._config.grid.voltage_entities[this._index]);
          }
          if (this._config?.grid.generator_voltage_entities) {
            grid_list.push(this._config.grid.generator_voltage_entities[this._index]);
          }
          this._openHistoryMulti(grid_list);
        }
        break;
      case '#power-allocation-image':
        if (this._config?.consumption.allocated_power_entity) {
          this._openHistory(this._config.consumption.allocated_power_entity);
        }
        break;
      default:
        break;
    }
  }

  _openHistory(entityId: string) {
    const event = new CustomEvent('hass-more-info', {
      detail: { entityId },
      bubbles: true,
      composed: true,
    });

    this.dispatchEvent(event);
  }

  private _openHistoryMulti(entityIds: string[]) {
    let currentIndex = 0;

    const openNext = () => {
      if (currentIndex >= entityIds.length) return;

      const entityId = entityIds[currentIndex++];
      this._openHistory(entityId);

      const appRoot = document.querySelector('home-assistant');
      if (appRoot) {
        const listener = () => {
          appRoot.removeEventListener('dialog-closed', listener);
          openNext();
        };
        appRoot.addEventListener('dialog-closed', listener);
      }
    };

    openNext();
  }

  getEntityState(entity: string) {
    const stateObj = this.hass!.states[entity];
    return stateObj.state;
  }

  getEntityStateInt(entity: string) {
    const stateObj = this.getEntityState(entity);
    return parseInt(stateObj);
  }

  getEntityParallelStateInt(entity_list: string[]) {
    let total = 0;
    if (this._config) {
      entity_list.forEach((entity) => {
        total += this.getEntityStateInt(entity);
      });
    }
    return total;
  }

  getEntityStateFloat(entity: string) {
    const stateObj = this.getEntityState(entity);
    return parseFloat(stateObj);
  }

  getEntityUnit(entity: string) {
    const stateObj = this.hass!.states[entity];
    return stateObj.attributes.unit_of_measurement;
  }

  getEntityAttribute(entity: string, attribute: string) {
    const stateObj = this.hass!.states[entity];
    if (stateObj.attributes && stateObj.attributes[attribute]) {
      return stateObj.attributes[attribute];
    }
    return '';
  }

  generateArrows(): TemplateResult[] {
    const arrowSrc = getBase64Data(base64Images.Arrow);
    return [1, 2, 3, 4].map((i) => html`<div class="arrow-${i}"><img src=${arrowSrc} /></div>`);
  }

  generateLongArrows(): TemplateResult[] {
    const arrowSrc = getBase64Data(base64Images.Arrow);
    return [1, 2, 3, 4, 5, 6, 7, 8].map((i) => html`<div class="arrow-long-${i}"><img src=${arrowSrc} /></div>`);
  }

  getIndex() {
    let index = 0;
    if (this._config) {
      if (this._config.inverter_count && this._config.inverter_count > 1) {
        const selector = this.renderRoot.querySelector('#inverter-selector') as HTMLSelectElement;
        if (selector) {
          const selector_value = selector.value;
          if (!isNaN(parseInt(selector_value))) {
            index = parseInt(selector_value);
            if (index == this._config.inverter_count) {
              index = -1;
            }
          } else {
            if (this._config.parallel?.parallel_first) {
              index = -1;
            } else {
              index = 0;
            }
          }
        } else {
          if (this._config.parallel?.parallel_first) {
            index = -1;
          } else {
            index = 0;
          }
        }
      }
    }
    this._index = index;
  }

  //////////////////////////////
  // Update time
  //////////////////////////////

  getTimeSince(timestamp: number) {
    const time_now = Date.now() / 1000;
    let diff = time_now - timestamp;
    switch (true) {
      case diff <= 2:
        return `just now`;
      case diff < 60:
        return `${Math.round(diff)} seconds ago`;
      case diff < 120:
        return `1 minute ago`;
      case diff >= 120:
        return `${Math.round(diff / 60)} minutes ago`;
      default:
        return ``;
    }
  }

  getInverterAlias(index: number): string {
    return (
      this._config?.parallel?.aliases?.[index] ?? this._config?.refresh?.lux_dongles?.[index] ?? `Inverter ${index}`
    );
  }

  //////////////////////////////
  // Status
  //////////////////////////////

  getStatus(code: number) {
    let status_dict = getStatusMessage(code);
    if (this._config?.status_codes?.overwrite_as_normal) {
      if (this._config?.status_codes?.overwrite_as_normal.includes(code)) {
        status_dict.level = statusLevels.Clear;
      }
    }
    if (this._config?.status_codes?.overwrite_as_warning) {
      if (this._config?.status_codes?.overwrite_as_warning.includes(code)) {
        status_dict.level = statusLevels.Warning;
      }
    }
    if (this._config?.status_codes?.overwrite_as_error) {
      if (this._config?.status_codes?.overwrite_as_error.includes(code)) {
        status_dict.level = statusLevels.Error;
      }
    }
    return status_dict;
  }

  getStatusMessage(status: StatusMessageType) {
    let status_message = ``;
    switch (status.level) {
      case statusLevels.Clear:
        status_message = `🟢 ${status.desc}`;
        break;
      case statusLevels.Warning:
        status_message = `🟠 ${status.desc}`;
        break;
      case statusLevels.Error:
        status_message = `🔴 ${status.desc}`;
        break;
    }
    return status_message;
  }

  //////////////////////////////
  // Grid
  //////////////////////////////

  getGridFlow() {
    let flow: number = 0;
    if (this._config && this._config?.grid.flow_entities) {
      if (this._index == -1) {
        flow = this.getEntityParallelStateInt(this._config.grid.flow_entities);
      } else {
        flow = this.getEntityStateInt(this._config.grid.flow_entities[this._index]);
      }
    }
    if (this._config?.grid.invert_flow) {
      flow = flow * -1;
    }
    return flow;
  }

  getGeneratorPower() {
    if (this._config && this._config.grid.generator_power_entities) {
      if (this._index == -1) {
        return this.getEntityParallelStateInt(this._config.grid.generator_power_entities);
      } else {
        return this.getEntityStateInt(this._config.grid.generator_power_entities[this._index]);
      }
    }
    return null;
  }

  getGridVoltage() {
    if (this._config?.grid.voltage_entities) {
      if (this._index == -1) {
        let grid_v = this.getEntityParallelStateInt(this._config.grid.voltage_entities);
        return Math.round(grid_v / this._config.inverter_count);
      } else {
        return this.getEntityStateInt(this._config.grid.voltage_entities[this._index]);
      }
    }
    return null;
  }

  getGeneratorVoltage() {
    if (this._config?.grid.generator_voltage_entities) {
      if (this._index == -1) {
        if (this._config.grid.generator_voltage_entities) {
          return this.getEntityParallelStateInt(this._config.grid.generator_voltage_entities);
        }
        return null;
      } else {
        return this.getEntityStateInt(this._config.grid.generator_voltage_entities[this._index]);
      }
    }
    return null;
  }

  //////////////////////////////
  // Consumption
  //////////////////////////////

  getHomeConsumption(index: number) {
    if (this._config && this._config.consumption.home_entities) {
      if (index == -1) {
        return this.getEntityParallelStateInt(this._config.consumption.home_entities);
      } else {
        return this.getEntityStateInt(this._config.consumption.home_entities[index]);
      }
    }
    return 0;
  }

  getBackupConsumption(index: number) {
    if (this._config && this._config.consumption.backup_entities) {
      if (index == -1) {
        return this.getEntityParallelStateInt(this._config.consumption.backup_entities);
      } else {
        return this.getEntityStateInt(this._config.consumption.backup_entities[index]);
      }
    }
    return 0;
  }

  getHomeArrow(index: number) {
    if (this._config) {
      const home_consumption = this.getHomeConsumption(index);
      const backup_consumption = this.getBackupConsumption(index);
      if (home_consumption > 0 || backup_consumption > 0) {
        return ARROW_DOWN;
      }
    }
    return ARROW_NONE;
  }

  //////////////////////////////
  // Solar
  //////////////////////////////

  getSolarProductionCombined(index: number) {
    if (this._config && this._config.pv && this._config.pv.combined_entities) {
      if (index != -1) {
        return this.getEntityStateInt(this._config.pv.combined_entities[index]);
      } else {
        return this.getEntityParallelStateInt(this._config.pv.combined_entities);
      }
    }
    return 0;
  }

  getSolarProductionIndividual(index: number) {
    let total: number = 0;
    if (this._config && this._config.pv) {
      if (index == -1) {
        if (this._config.pv.array_1_entities) {
          total += this.getEntityParallelStateInt(this._config.pv.array_1_entities);
        }
        if (this._config.pv.array_2_entities) {
          total += this.getEntityParallelStateInt(this._config.pv.array_2_entities);
        }
        if (this._config.pv.array_3_entities) {
          total += this.getEntityParallelStateInt(this._config.pv.array_3_entities);
        }
        return total;
      } else {
        if (this._config.pv.array_1_entities) {
          total += this.getEntityStateInt(this._config.pv.array_1_entities[index]);
        }
        if (this._config.pv.array_2_entities) {
          total += this.getEntityStateInt(this._config.pv.array_2_entities[index]);
        }
        if (this._config.pv.array_3_entities) {
          total += this.getEntityStateInt(this._config.pv.array_3_entities[index]);
        }
        return total;
      }
    }
    return total;
  }

  //////////////////////////////
  // Battery
  //////////////////////////////

  getBatteryFlow(index: number) {
    let flow = 0;
    if (this._config?.battery.flow_entities) {
      if (index == -1) {
        for (let i = 0; i < this._config.inverter_count; i++) {
          flow += this.getEntityStateInt(this._config.battery.flow_entities[i]);
        }
        if (this._config?.battery.invert_flow) {
          return flow * -1;
        }
        return flow;
      } else {
        flow = this.getEntityStateInt(this._config.battery.flow_entities[index]);
      }
      if (this._config?.battery.invert_flow) {
        return flow * -1;
      }
      return flow;
    }
    if (this._config?.battery.discharge_live_entities && this._config?.battery.charge_live_entities) {
      if (index == -1) {
        for (let i = 0; i < this._config.inverter_count; i++) {
          flow += this.getEntityStateInt(this._config.battery.charge_live_entities[i]);
          flow -= this.getEntityStateInt(this._config.battery.discharge_live_entities[i]);
        }
        return flow;
      } else {
        let charge = this.getEntityStateInt(this._config.battery.charge_live_entities[index]);
        let discharge = this.getEntityStateInt(this._config.battery.discharge_live_entities[index]);
        flow = charge - discharge;
        return flow;
      }
    }
    return 0;
  }

  getBatterySoc(index: number) {
    let battery_soc = 0;
    if (this._config?.battery.soc_entities) {
      if (index == -1) {
        if (this._config?.battery.parallel_soc_entity && this._config?.battery.show_parallel_soc_entity) {
          battery_soc = this.getEntityStateInt(this._config.battery.parallel_soc_entity);
        } else {
          battery_soc = this.getEntityParallelStateInt(this._config.battery.soc_entities);
          return Math.round(battery_soc / this._config.inverter_count);
        }
      } else {
        battery_soc = this.getEntityStateInt(this._config.battery.soc_entities[index]);
      }
      return battery_soc;
    }
    return 0;
  }

  getBatteryVoltage(index: number) {
    let battery_v = 0;
    if (this._config?.battery.voltage_entities) {
      if (index == -1) {
        if (this._config?.battery?.parallel_average_voltage) {
          battery_v = this.getEntityParallelStateInt(this._config.battery.voltage_entities);
          battery_v = Math.round(battery_v / this._config.inverter_count);
          return `${battery_v} Vdc (avg)`;
        }
      } else {
        battery_v = this.getEntityStateInt(this._config.battery.voltage_entities[index]);
        return `${battery_v} Vdc`;
      }
    }
    return ``;
  }

  convertRuntimeToString(runtime: number, format: string) {
    const hours = Math.floor(runtime);
    const minutes = Math.round((runtime % 1) * 60);
    switch (format) {
      case 'short':
        return `${hours}:${minutes} remaining`;
      case 'long':
        return `${hours}h, ${minutes}m`;
      default:
        return '';
    }
  }

  //////////////////////////////
  // Render
  //////////////////////////////

  protected render() {
    if (!this._config || !this.hass) return nothing;

    // ----- Selector and index
    this.getIndex();
    let parallel_selector: TemplateResult | typeof nothing = nothing;
    if (
      this._config.inverter_count > 1 &&
      ((this._config.parallel && this._config.parallel.aliases) ||
        (this._config.refresh && this._config.refresh.lux_dongles))
    ) {
      const aliases = this._config.parallel?.aliases ?? [];
      const parallelFirst = Boolean(this._config.parallel?.parallel_first);
      parallel_selector = html`
        <select class="inv-select" name="Inverters" id="inverter-selector" @change=${() => this._update()}>
          ${parallelFirst ? html`<option value=${String(this._config.inverter_count)}>Parallel</option>` : nothing}
          ${Array.from({ length: this._config.inverter_count }, (_, i) =>
            aliases[i] !== undefined ? html`<option value=${String(i)}>${aliases[i]}</option>` : nothing
          )}
          ${!parallelFirst ? html`<option value=${String(this._config.inverter_count)}>Parallel</option>` : nothing}
        </select>
      `;
    }

    // ----- Title
    const title = this._config?.title ? html`<h1 class="card-header">${this._config.title}</h1>` : nothing;

    // ----- Refresh button
    const refresh_button_location = this._config.refresh?.button_location || 'none';
    const refresh_button_right = html`
      <button id="refresh-button-right" class="icon-button" @click=${() => this._handleRefresh()}>
        <ha-icon icon="mdi:cloud-refresh"></ha-icon>
      </button>
    `;
    const refresh_button_left = html`
      <button id="refresh-button-left" class="icon-button" @click=${() => this._handleRefresh()}>
        <ha-icon icon="mdi:cloud-refresh"></ha-icon>
      </button>
    `;

    // ----- Status codes
    let status_code = '';
    if (this._config.status_codes?.entities) {
      if (this._index == -1) {
        const sts_arr: StatusMessageType[] = this._config.status_codes.entities.map((entity) =>
          this.getStatus(this.getEntityStateInt(entity))
        );
        const disct_count = new Set(sts_arr.map((obj) => JSON.stringify(Object.entries(obj).sort()))).size;
        if (disct_count == 1 && sts_arr.length > 0) {
          status_code = this.getStatusMessage(sts_arr[0]);
        } else if (sts_arr.length > 0) {
          const sts_arr_sorted = [...sts_arr].sort((a, b) => b.level - a.level);
          const highest_level = sts_arr_sorted[0].level;
          const top_level_messages = sts_arr_sorted.filter((m) => m.level === highest_level);
          if (top_level_messages.length === 1) {
            status_code = this.getStatusMessage(sts_arr_sorted[0]);
          }
        }
      } else {
        const code = this.getEntityStateInt(this._config.status_codes.entities[this._index]);
        status_code = this.getStatusMessage(this.getStatus(code));
      }
    }

    // ----- Solar
    let solar_info: TemplateResult | typeof nothing = nothing;
    let solar_arrow = ARROW_NONE;
    if (
      this._config.pv &&
      (this._config.pv.combined_entities ||
        this._config.pv.array_1_entities ||
        this._config.pv.array_2_entities ||
        this._config.pv.array_3_entities)
    ) {
      const combined_solar_flow = this.getSolarProductionCombined(this._index);
      const individual_solar_flow = this.getSolarProductionIndividual(this._index);
      solar_arrow = combined_solar_flow > 0 || individual_solar_flow > 0 ? ARROW_DOWN : ARROW_NONE;

      if (this._config.pv.combined_entities) {
        solar_info = html`
          <div>
            <p class="header-text">${combined_solar_flow} W</p>
            <p class="sub-text">${combined_solar_flow > 0 ? 'PV Power' : ''}</p>
          </div>
        `;
      } else if (this._index == -1) {
        const total = this.getSolarProductionIndividual(this._index);
        solar_info = html`
          <div>
            <p class="header-text">${total} W</p>
            <p class="sub-text">${total > 0 ? 'PV Power' : ''}</p>
          </div>
        `;
      } else {
        solar_info = html`
          <div>
            ${this._config.pv.array_1_entities
              ? html`<p class="header-text">A1: ${this.getEntityStateInt(this._config.pv.array_1_entities[this._index])} W</p>`
              : nothing}
            ${this._config.pv.array_2_entities
              ? html`<p class="header-text">A2: ${this.getEntityStateInt(this._config.pv.array_2_entities[this._index])} W</p>`
              : nothing}
            ${this._config.pv.array_3_entities
              ? html`<p class="header-text">A3: ${this.getEntityStateInt(this._config.pv.array_3_entities[this._index])} W</p>`
              : nothing}
          </div>
        `;
      }
    }

    // ----- Battery
    let battery_flow_info: TemplateResult | typeof nothing = nothing;
    let battery_image = html`<img src=${getBase64Data(base64Images.Battery5)} />`;
    let battery_arrow = ARROW_NONE;
    let battery_soc_info: TemplateResult | typeof nothing = nothing;
    let battery_bottom_runtime: TemplateResult | typeof nothing = nothing;
    if (this._config.battery) {
      const battery_soc = this.getBatterySoc(this._index);
      const battery_flow = this.getBatteryFlow(this._index);
      battery_image = html`<img src=${getBatteryImage(battery_soc)} />`;

      let header_text = '0 W';
      let sub_text = 'Idle';
      if (battery_flow < 0) {
        header_text = `${Math.abs(battery_flow)} W`;
        sub_text = 'Discharge Power';
        battery_arrow = ARROW_RIGHT;
      } else if (battery_flow > 0) {
        header_text = `${battery_flow} W`;
        sub_text = 'Charge Power';
        battery_arrow = ARROW_LEFT;
      }
      battery_flow_info = html`
        <div>
          <p class="header-text">${header_text}</p>
          <p class="sub-text">${sub_text}</p>
        </div>
      `;

      let battery_top_runtime: TemplateResult | typeof nothing = nothing;
      if (
        this._config.battery.capacity_ah_entities &&
        this._config.battery.voltage_entities &&
        battery_flow != 0 &&
        this._config.battery.soc_entities &&
        battery_soc != 100 &&
        this._config.battery.runtime_location &&
        ['bottom', 'left', 'both'].includes(this._config.battery.runtime_location)
      ) {
        let total_cap_wh = 0;
        if (this._index == -1) {
          for (let i = 0; i < this._config.inverter_count; i++) {
            const cap_ah = this.getEntityStateInt(this._config.battery.capacity_ah_entities[i]);
            total_cap_wh += cap_ah * this.getEntityStateInt(this._config.battery.voltage_entities[i]);
          }
        } else {
          const cap_ah = this.getEntityStateInt(this._config.battery.capacity_ah_entities[this._index]);
          total_cap_wh = cap_ah * this.getEntityStateInt(this._config.battery.voltage_entities[this._index]);
        }
        const dod = this._config.battery.depth_of_discharge ?? 20;
        if (battery_flow < 0) {
          const avail_wh = (total_cap_wh * (battery_soc - dod)) / 100;
          const rem_h = avail_wh / Math.abs(battery_flow);
          if (['bottom', 'both'].includes(this._config.battery.runtime_location)) {
            battery_bottom_runtime = html`<p id="time-info" class="header-text">${this.convertRuntimeToString(rem_h, 'long')} remaining battery usage</p>`;
          }
          if (['left', 'both'].includes(this._config.battery.runtime_location)) {
            battery_top_runtime = html`<p class="header-text">${this.convertRuntimeToString(rem_h, 'short')}</p>`;
          }
        } else if (battery_flow > 0 && battery_soc < 90) {
          const avail_wh = (total_cap_wh * (90 - battery_soc)) / 100;
          const rem_h = avail_wh / Math.abs(battery_flow);
          if (['bottom', 'both'].includes(this._config.battery.runtime_location)) {
            battery_bottom_runtime = html`<p id="time-info" class="header-text">${this.convertRuntimeToString(rem_h, 'long')} remaining to charge to 90%</p>`;
          }
          if (['left', 'both'].includes(this._config.battery.runtime_location)) {
            battery_top_runtime = html`<p class="header-text">${this.convertRuntimeToString(rem_h, 'short')}</p>`;
          }
        }
      }
      battery_soc_info = html`
        <div>
          <p class="header-text">${battery_soc} %</p>
          <p class="header-text">${this.getBatteryVoltage(this._index)}</p>
          ${battery_top_runtime}
        </div>
      `;
    }

    // ----- Temp
    let temp_info: TemplateResult | string = '';
    if (this._config.temp?.entities) {
      if (this._index == -1) {
        temp_info = html`${Array.from({ length: this._config.inverter_count }, (_, i) => {
          const temp = this.getEntityStateFloat(this._config!.temp!.entities![i]);
          const temp_unit = this.getEntityUnit(this._config!.temp!.entities![i]);
          const inv_alias =
            this._config!.parallel?.aliases?.[i] ??
            this._config!.refresh?.lux_dongles?.[i] ??
            `Inv ${i}`;
          return html`<br />${inv_alias}: ${temp}${temp_unit}`;
        })}`;
      } else {
        const temp = this.getEntityStateFloat(this._config.temp.entities[this._index]);
        const temp_unit = this.getEntityUnit(this._config.temp.entities[this._index]);
        temp_info = `${temp}${temp_unit}`;
      }
    }

    // ----- Inverter (rendered declaratively via Lit html template)
    const inverter_image = html`<img
      src=${getBase64Data(this._index == -1 ? base64Images.ParallelInverter : base64Images.Inverter)}
    />`;

    // ----- Grid
    let grid_arrow = ARROW_NONE;
    let grid_image_class = '';
    const grid_flow = this.getGridFlow();
    const gen_power = this.getGeneratorPower();
    const grid_voltage = this.getGridVoltage();
    const gen_voltage = this.getGeneratorVoltage();
    let grid_emoji = '';
    let grid_voltage_str = '';
    if (grid_flow < 0) {
      grid_arrow = ARROW_LEFT;
    } else if (grid_flow > 0) {
      grid_arrow = ARROW_RIGHT;
    } else if (gen_power && gen_power > 0) {
      grid_arrow = ARROW_LEFT;
    }
    if (grid_voltage != null) {
      if (grid_voltage == 0) {
        if (this._config.grid.indicators?.hue) grid_image_class = 'blend-overlay';
        if (this._config.grid.indicators?.dot) grid_emoji = ' 🔴';
      }
      grid_voltage_str = `${grid_voltage} Vac`;
    } else if (gen_voltage != null) {
      if (gen_voltage == 0) {
        if (this._config.grid.indicators?.hue) grid_image_class = 'blend-overlay';
        if (this._config.grid.indicators?.dot) grid_emoji = ' 🔴';
      }
      grid_voltage_str = `${gen_voltage} Vac`;
    }
    if (this._index == -1) {
      grid_voltage_str = this._config.grid.parallel_average_voltage ? `${grid_voltage_str} (avg)${grid_emoji}` : '';
    } else {
      grid_voltage_str = `${grid_voltage_str}${grid_emoji}`;
    }
    const grid_info = html`
      <div>
        <p class="header-text">${grid_flow != null ? Math.abs(grid_flow) : gen_power != null ? Math.abs(gen_power) : 0} W</p>
        <p class="header-text">${grid_voltage_str}</p>
      </div>
    `;

    // ----- Consumption
    const home_consumption = this.getHomeConsumption(this._index);
    const backup_consumption = this.getBackupConsumption(this._index);
    const consumption_arrow = home_consumption > 0 || backup_consumption > 0 ? ARROW_DOWN : ARROW_NONE;
    const consumption_header =
      home_consumption > 0
        ? `${Math.abs(home_consumption)} W`
        : backup_consumption > 0
          ? `${Math.abs(backup_consumption)} W`
          : '0 W';
    const consumption_sub = home_consumption > 0 ? 'Home Usage' : backup_consumption > 0 ? 'Backup Power' : '';
    const consumption_info = html`
      <div>
        <p class="header-text">${consumption_header}</p>
        <p class="sub-text">${consumption_sub}</p>
      </div>
    `;

    // ----- Allocated Power
    let allocated_arrow = ARROW_NONE;
    let allocated_info: TemplateResult | typeof nothing = nothing;
    if (this._config.consumption.allocated_power_entity) {
      const allocated_power = this.getEntityStateInt(this._config.consumption.allocated_power_entity);
      if (allocated_power > 0) allocated_arrow = ARROW_RIGHT;
      allocated_info = html`
        <div>
          <p class="header-text">${allocated_power} W</p>
          <p class="sub-text">Allocated Power</p>
        </div>
      `;
    }

    // ----- Updated time and Battery runtime
    let updated_time_block: TemplateResult | typeof nothing = nothing;
    if (this._config.update_time?.entities) {
      if (this._index == -1 && this._config.update_time.has_timestamp_attribute) {
        let oldest_update_ts = Number(this.getEntityAttribute(this._config.update_time.entities[0], 'timestamp'));
        let oldest_update_index = 0;
        let latest_update_ts = oldest_update_ts;
        for (let i = 1; i < this._config.inverter_count; i++) {
          const test_time = Number(this.getEntityAttribute(this._config.update_time.entities[i], 'timestamp'));
          if (test_time < oldest_update_ts) {
            oldest_update_ts = test_time;
            oldest_update_index = i;
          }
          if (test_time > latest_update_ts) {
            latest_update_ts = test_time;
          }
        }
        const biggest_diff_sec = Math.abs(latest_update_ts - oldest_update_ts);
        const update_state = this.getEntityState(this._config.update_time.entities[oldest_update_index]);
        const prefix = biggest_diff_sec < 3 ? '' : `${this.getInverterAlias(oldest_update_index)} `;
        const label_dt = biggest_diff_sec < 3 ? 'Last update at:' : `${prefix}last update at:`;
        const label_since = biggest_diff_sec < 3 ? 'Updated' : `${prefix}updated`;
        updated_time_block = html`
          ${this._config.update_time.show_datetime
            ? html`<p id="time-info" class="header-text">${label_dt} ${update_state}</p>`
            : nothing}
          ${this._config.update_time.show_time_since && this._config.update_time.show_datetime ? html`<p></p>` : nothing}
          ${this._config.update_time.show_time_since
            ? html`<p id="since-info" class="header-text">${label_since} ${this.getTimeSince(oldest_update_ts)}</p>`
            : nothing}
        `;
      } else if (this._index != -1) {
        const update_time = this.getEntityState(this._config.update_time.entities[this._index]);
        const last_time_ts = Number(this.getEntityAttribute(this._config.update_time.entities[this._index], 'timestamp'));
        const show_since = Boolean(this._config.update_time.show_time_since && this._config.update_time.has_timestamp_attribute);
        updated_time_block = html`
          ${this._config.update_time.show_datetime
            ? html`<p id="time-info" class="header-text">Last update at: ${update_time}</p>`
            : nothing}
          ${show_since && this._config.update_time.show_datetime ? html`<p></p>` : nothing}
          ${show_since
            ? html`<p id="since-info" class="header-text">Updated ${this.getTimeSince(last_time_ts)}</p>`
            : nothing}
        `;
      }
    }
    const updated_time_battery_runtime = html`
      ${updated_time_block}
      ${updated_time_block !== nothing && battery_bottom_runtime !== nothing ? html`<p></p>` : nothing}
      ${battery_bottom_runtime}
    `;

    return html`
      <ha-card>
        <style>
          /* CARD */
          ha-card {
            width: auto;
            padding-left: 15px;
            padding-right: 15px;
            padding-top: ${this._config.title ? 0 : 15}px;
            padding-bottom: 15px;
          }

          /* GRID */
          .diagram-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            grid-template-rows: repeat(${this._config.pv ? 5 : 4}, 1fr);
            padding-left: 5px;
            padding-right: 5px;
          }
          .status-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(1, 1fr);
            padding-left: 5px;
            padding-right: 5px;
            padding-top: ${this._config.title ? 0 : 10}px;
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
          .temp-cell {
            align-self: end;
            align-content: left;
            font-size: min(4vw, 1em);
            font-weight: bold;
            line-height: 1;
            margin: 0;
          }
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
          .battery-runtime-text {
            font-size: min(2vw, 0.8em);
            color: var(--secondary-text-color);
            line-height: 1;
            margin: 0;
            padding-left: 3px;
            padding-right: 3px;
            padding-top: 1px;
            padding-bottom: 1px;
            text-align: center;
          }
          .pv-main-text {
            font-size: min(4vw, 1em);
            font-weight: bold;
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
          .arrow-long-cell {
            margin: auto;
            display: flex;
            align-items: center;

            text-align: center;
            justify-content: center;
            width: auto;
            object-fit: contain;
            position: relative;
            grid-column: span 2;
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

          /* ARROW ANIMATIONS CELL*/
          @keyframes arrow-flash {
            0% {
              opacity: 1;
            }
            16% {
              opacity: 0.65;
            }
            32% {
              opacity: 0.3;
            }
            48% {
              opacity: 0.3;
            }
            64% {
              opacity: 0.3;
            }
            80% {
              opacity: 0.3;
            }
            100% {
              opacity: 1;
            }
          }
          .arrow-1 {
            animation: arrow-flash 1.5s infinite;
            animation-delay: 0.75s;
          }
          .arrow-2 {
            animation: arrow-flash 1.5s infinite;
            animation-delay: 0.5s;
          }
          .arrow-3 {
            animation: arrow-flash 1.5s infinite;
            animation-delay: 0.25s;
          }
          .arrow-4 {
            animation: arrow-flash 1.5s infinite;
          }

          @keyframes arrow-long-flash {
            0% {
              opacity: 1;
            }
            16% {
              opacity: 0.65;
            }
            32% {
              opacity: 0.3;
            }
            48% {
              opacity: 0.3;
            }
            64% {
              opacity: 0.3;
            }
            80% {
              opacity: 0.3;
            }
            100% {
              opacity: 1;
            }
          }
          .arrow-long-1 {
            animation: arrow-long-flash 1.5s infinite;
            animation-delay: 1.75s;
          }
          .arrow-long-2 {
            animation: arrow-long-flash 1.5s infinite;
            animation-delay: 1.5s;
          }
          .arrow-long-3 {
            animation: arrow-long-flash 1.5s infinite;
            animation-delay: 1.25s;
          }
          .arrow-long-4 {
            animation: arrow-long-flash 1.5s infinite;
            animation-delay: 1s;
          }
          .arrow-long-5 {
            animation: arrow-long-flash 1.5s infinite;
            animation-delay: 0.75s;
          }
          .arrow-long-6 {
            animation: arrow-long-flash 1.5s infinite;
            animation-delay: 0.5s;
          }
          .arrow-long-7 {
            animation: arrow-long-flash 1.5s infinite;
            animation-delay: 0.25s;
          }
          .arrow-long-8 {
            animation: arrow-long-flash 1.5s infinite;
          }

          /* TIME AND DATE */
          .update-time {
            text-align: left;
            margin: 0;
            padding-left: 5px;
            padding-right: 5px;
          }
          .grid-status {
            text-align: right;
            margin: 0;
            line-height: 1;
          }
          .temp {
            text-align: right;
            margin: 0;
            line-height: 1;
          }
          .inv-select {
            align-items: left;
            margin: 0;
            line-height: 1;
          }
        </style>
        <div>
          ${title}
          <card-content>
            <div id="taskbar-grid" class="status-grid">
              <div id="select-cell" class="cell">${parallel_selector}</div>
              <div id="status-cell" class="cell grid-status">${status_code}</div>
            </div>
            <div id="card-grid" class="diagram-grid">
              ${this._config?.pv && (this._config?.pv?.array_1_entities || this._config?.pv?.combined_entities)
                ? html`
                    <div class="cell"></div>
                    <div class="cell"></div>
                    <div id="solar-image" class="cell image-cell">
                      <img src=${getBase64Data(base64Images.Solar)} />
                    </div>
                    <div id="solar-info" class="cell text-cell">${solar_info}</div>
                    <div class="cell"></div>
                    <div class="cell"></div>
                    <div id="battery-charge-info" class="cell text-cell">${battery_flow_info}</div>
                    <div class="cell"></div>
                    <div id="solar-arrows" class="cell arrow-cell ${solar_arrow}">${this.generateArrows()}</div>
                    <div id="temp-info" class="cell temp-cell">${temp_info}</div>
                    <div class="cell temp-cell"></div>
                    <div class="cell">
                      ${['right', 'both'].includes(refresh_button_location) ? refresh_button_right : nothing}
                    </div>
                  `
                : html`
                    <div id="battery-charge-info" class="cell text-cell">${battery_flow_info}</div>
                    <div class="cell"></div>
                    <div class="cell"></div>
                    <div id="temp-info" class="cell temp-cell">${temp_info}</div>
                    <div class="cell"></div>
                    <div class="cell">
                      ${['right', 'both'].includes(refresh_button_location) ? refresh_button_right : nothing}
                    </div>
                  `}

              <div id="battery-image" class="cell image-cell">${battery_image}</div>
              <div id="battery-arrows" class="cell arrow-cell ${battery_arrow}">${this.generateArrows()}</div>
              <div id="inverter-image" class="cell image-cell">${inverter_image}</div>
              <div id="grid-arrows" class="cell arrow-long-cell ${grid_arrow}">${this.generateLongArrows()}</div>
              <div id="grid-image" class="cell image-cell ${grid_image_class}">
                <img src=${getBase64Data(base64Images.Grid)} />
              </div>

              <div id="battery-soc-info" class="cell text-cell">${battery_soc_info}</div>
              <div class="cell"></div>
              <div id="home-arrows" class="cell arrow-cell ${consumption_arrow}">${this.generateArrows()}</div>
              <div class="cell"></div>
              <div class="cell"></div>
              <div id="grid-info" class="cell text-cell">${grid_info}</div>

              ${this._config?.consumption.allocated_power_entity
                ? html`
                    <div class="cell">
                      ${['left', 'both'].includes(refresh_button_location) ? refresh_button_left : nothing}
                    </div>
                    <div id="home-info" class="cell text-cell">${consumption_info}</div>
                    <div id="home-image" class="cell image-cell">
                      <img src=${getBase64Data(base64Images.HomeNormal)} />
                    </div>
                    <div id="power-allocation-arrows" class="cell arrow-cell ${allocated_arrow}">
                      ${this.generateArrows()}
                    </div>
                    <div id="power-allocation-image" class="cell image-cell">
                      <img src=${getBase64Data(base64Images.HomeNormal)} />
                    </div>
                    <div id="power-allocation-info" class="cell text-cell">${allocated_info}</div>
                  `
                : html`
                    <div class="cell">
                      ${['left', 'both'].includes(refresh_button_location) ? refresh_button_left : nothing}
                    </div>
                    <div id="home-info" class="cell text-cell">${consumption_info}</div>
                    <div id="home-image" class="cell image-cell">
                      <img src=${getBase64Data(base64Images.HomeNormal)} />
                    </div>
                    <div class="cell"></div>
                    <div class="cell"></div>
                    <div class="cell"></div>
                  `}
            </div>
            <div class="update-time">${updated_time_battery_runtime}</div>
          </card-content>
        </div>
      </ha-card>
    `;
  }
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: CARD_NAME,
  name: CARD_FULL_NAME,
  description: 'Power-distribution card based on the LuxpowerTek UI',
  preview: true,
});
