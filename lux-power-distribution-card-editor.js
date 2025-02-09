import {
    LitElement,
    html
  } from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";
  
  class LuxPowerDistributionCardEditor extends LitElement {
    setConfig(config) {
      this._config = {...config};
    }
  
    static get properties() {
      return {
          hass: {},
          _config: {}
      };
    }
  
    generateOptionRefreshButton(formData) {
      if (!this._config || !this._config.lux_dongle || this._config.lux_dongle.length === 0) {
        return html``;
      }
      return html`
        <h3>
          Refresh button location
        </h3>
        <ha-form
          .hass=${this.hass}
          .data=${formData}
          .schema=${[
            {
              name: "refresh_button",
              selector: { select: { 
                mode: "dropdown",
                options: [
                  { value: "none", label: "None" },
                  { value: "left", label: "Left" },
                  { value: "right", label: "Right" },
                  { value: "both", label: "Both" },
                ], 
              } }
            },
          ]}
          .computeLabel=${() => ""}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <br>
      `
  
    }
    generateOptionInverterAliases(formData) {
      if (!this._config || this._config.inverter_count === 1) {
        return html``;
      }
      return html`
        <h3>
          Inverter alias
        </h3>
        <ha-form
          .hass=${this.hass}
          .data=${formData}
          .schema=${[
            {
              name: "inverter_alias",
              selector: { text: { 
                multiple: true
              } }
            },
          ]}
          .computeLabel=${() => ""}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <br>
      `;
    }
    generateOptionGridIndicator(formData) {
      if (!this._config || !this._config.grid_voltage?.entities || this._config.grid_voltage.entities.length === 0) {
        return html``;
      }
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${formData}
          .schema=${[
            {
              name: "grid_indicator_hue",
              selector: { boolean: { } }
            },
          ]}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
        <ha-form
          .hass=${this.hass}
          .data=${formData}
          .schema=${[
            {
              name: "grid_indicator_dot",
              selector: { boolean: { } }
            },
          ]}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }
    generateOptionUpdateTimeShowLastUpdate(formData) {
      if (!this._config || !this._config.update_time?.entities || this._config.update_time.entities.length === 0) {
        return html``;
      }
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${formData}
          .schema=${[
            {
              name: "update_time_show_last_update",
              selector: { boolean: { } }
            },
          ]}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }
    generateOptionGridWarningIndicator(formData) {
      if (!this._config || !this._config.status_codes?.entities || this._config.status_codes.entities.length === 0) {
        return html``;
      }
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${formData}
          .schema=${[
            {
              name: "status_codes_no_grid_is_warning",
              selector: { boolean: { } }
            },
          ]}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }
    generateOptionParallelAverage(formData) {
      if (!this._config || this._config.inverter_count === 1) {
        return html``;
      }
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${formData}
          .schema=${[
            {
              name: "parallel_average_voltage",
              selector: { boolean: { } }
            },
          ]}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }
    generateOptionParallelParallelFirst(formData) {
      if (!this._config || this._config.inverter_count === 1) {
        return html``;
      }
      return html`
        <ha-form
          .hass=${this.hass}
          .data=${formData}
          .schema=${[
            {
              name: "parallel_parallel_first",
              selector: { boolean: { } }
            },
          ]}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }
  
  
    render() {
      let formData = {
        // Required
        inverter_count: this._config?.inverter_count || 1,
        battery_soc_entities: this._config?.battery_soc?.entities ?? [],
        battery_flow_entities: this._config?.battery_flow?.entities ?? [],
        home_consumption_entities: this._config?.home_consumption?.entities ?? [],
        grid_flow_entities: this._config?.grid_flow?.entities ?? [],
  
        // Aditional
        battery_voltage_entities: this._config?.battery_voltage?.entities ?? [],
        backup_power_entities: this._config?.backup_power?.entities ?? [],
        grid_voltage_entities: this._config?.grid_voltage?.entities ?? [],
        update_time_entities: this._config?.update_time?.entities ?? [],
        status_codes_entities: this._config?.status_codes?.entities ?? [],
        temp_entities: this._config?.temp?.entities ?? [],
        energy_allocations_entities: this._config?.energy_allocations?.entities ?? [],
        
        // PV
        solar_combined_entities: this._config?.pv_power?.entities ?? [],
        
        // Optional
        title: this._config?.title ?? "",
        lux_dongle: this._config?.lux_dongle ?? [],
        inverter_alias: this._config?.inverter_alias ?? [],
        refresh_button: this._config?.refresh_button ?? "",
        grid_indicator_hue: this._config?.grid_indicator?.hue ?? false,
        grid_indicator_dot: this._config?.grid_indicator?.dot ?? false,
        update_time_show_last_update: this._config?.update_time?.show_last_update ?? false,
        status_codes_no_grid_is_warning: this._config?.status_codes?.no_grid_is_warning ?? false,
        parallel_average_voltage: this._config?.parallel?.average_voltage ?? false,
        parallel_parallel_first: this._config?.parallel?.parallel_first ?? false,
        grid_flow_reverse: this._config?.grid_flow?.reverse ?? false,
      }
  
      return html`
        <div class="card-config">
          <h2>
            Required entities
          </h2>
          <p>
            The card needs entities for the following configurations in order to function at a minimal level:
            <ul>
              <li>Inverter count</li>
              <li>Battery SoC</li>
              <li>Battery flow</li>
              <li>Grid flow</li>
              <li>Home consumption</li>
            </ul>
            For each inverter entity (like those above, but also many optional entities), the number of entities for each category needs to match the number of inverters.
            <br>
          </p>
  
          <ha-expansion-panel outlined>
            <h4 slot="header">
              <ha-icon icon="mdi:exclamation-thick"></ha-icon>
              Required config
            </h4>
            <h3>
              Inverter count
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "inverter_count",
                  required: true,
                  selector: { number: { min: 1, max: 15, mode: "box" } }
                },
              ]}
              .computeLabel=${this._computeLabelCallback}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <h3>
              Battery SoC
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "battery_soc_entities",
                  required: true,
                  selector: { entity: { 
                    multiple: true,
                    domain: ["sensor"]
                  } }
                },
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <h3>
              Battery flow
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "battery_flow_entities",
                  required: true,
                  selector: { entity: { 
                    multiple: true,
                    domain: ["sensor"]
                  } }
                }
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <h3>
              Home consumption
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "home_consumption_entities",
                  required: true,
                  selector: { entity: { 
                    multiple: true,
                    domain: ["sensor"]
                  } }
                },
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <h3>
              Grid flow
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "grid_flow_entities",
                  required: true,
                  selector: { entity: { 
                    multiple: true,
                    domain: ["sensor"]
                  } }
                },
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <br>
          </ha-expansion-panel>
          <br>
  
          <ha-expansion-panel outlined>
            <h4 slot="header">
              <ha-icon icon="mdi:cog"></ha-icon>
              Additions entities
            </h4>
            <h3>
              Battery Voltage
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "battery_voltage_entities",
                  selector: { entity: { 
                    multiple: true,
                    domain: ["sensor"]
                  } }
                },
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <br>
            <h3>
              Backup power
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "backup_power_entities",
                  selector: { entity: { 
                    multiple: true,
                    domain: ["sensor"]
                  } }
                },
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <br>
            <h3>
              Grid voltage
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "grid_voltage_entities",
                  selector: { entity: { 
                    multiple: true,
                    domain: ["sensor"]
                  } }
                },
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <br>
            <h3>
              Status codes
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "status_codes_entities",
                  selector: { entity: { 
                    multiple: true,
                    domain: ["sensor"]
                  } }
                },
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <br>
            <h3>
              Update time
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "update_time_entities",
                  selector: { entity: { 
                    multiple: true,
                    domain: ["sensor"]
                  } }
                },
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <br>
            <h3>
              Inverter temp
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "temp_entities",
                  selector: { entity: { 
                    multiple: true,
                    domain: ["sensor"]
                  } }
                },
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <br>
            <h3>
              Energy allocations
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "energy_allocations_entities",
                  selector: { entity: { 
                    multiple: true,
                    domain: ["sensor"]
                  } }
                },
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <br>
          </ha-expansion-panel>
          <br>
  
          <ha-expansion-panel outlined>
            <h4 slot="header">
              <ha-icon icon="mdi:solar-power"></ha-icon>
              Solar settings
            </h4>
            <h3>
              Solar entities
            </h3>
            <ha-form
              .hass=${this.hass}
              .data=${formData}
              .schema=${[
                {
                  name: "solar_combined_entities",
                  selector: { entity: {
                    multiple: true,
                    domain: ["sensor"]
                  } }
                },
              ]}
              .computeLabel=${() => ""}
              @value-changed=${this._valueChanged}
            ></ha-form>
            <br>
          </ha-expansion-panel>
          <br>
  
          <ha-expansion-panel outlined>
            <h4 slot="header">
              Optional settings
            </h4>
            <div class="content">
              <h3>
                Title
              </h3>
              <ha-form
                .hass=${this.hass}
                .data=${formData}
                .schema=${[
                  {
                    name: "title",
                    selector: { text: { } }
                  },
                ]}
                .computeLabel=${() => ""}
                @value-changed=${this._valueChanged}
              ></ha-form>
              <br>
              <h3>
                Dongle serial number
              </h3>
              <ha-form
                .hass=${this.hass}
                .data=${formData}
                .schema=${[
                  {
                    name: "lux_dongle",
                    selector: { text: { 
                      multiple: true
                    } }
                  },
                ]}
                .computeLabel=${() => ""}
                @value-changed=${this._valueChanged}
              ></ha-form>
              <br>
              ${this.generateOptionInverterAliases(formData)}
              ${this.generateOptionRefreshButton(formData)}
              ${this.generateOptionGridIndicator(formData)}
              ${this.generateOptionUpdateTimeShowLastUpdate(formData)}
              ${this.generateOptionGridWarningIndicator(formData)}
              ${this.generateOptionParallelAverage(formData)}
              ${this.generateOptionParallelParallelFirst(formData)}
              <ha-form
                .hass=${this.hass}
                .data=${formData}
                .schema=${[
                  {
                    name: "grid_flow_reverse",
                    selector: { boolean: { } }
                  },
                ]}
                .computeLabel=${this._computeLabelCallback}
                @value-changed=${this._valueChanged}
              ></ha-form>
            </div>
            <br>
          </ha-expansion-panel>
          <br>
          A more extensive explaination on the settings can be found <a href="https://github.com/DanteWinters/lux-power-distribution-card">here</a> on the card's GitHub page in the README.
        </div>
      `;
    }
  // ${this.makeDropdown("Refresh button locations", "refresh_locations", refresh_options )}
  
    _computeLabelCallback(schema) {
      const labels = {
        title: "Title (Optional)",
        inverter_count: "Inverter count (Required, default: 1)",
        grid_indicator_hue: "Hue indicator (When grid is unavailable)",
        grid_indicator_dot: "Dot indicator (When grid is unavailable)",
        update_time_show_last_update: "Show how long ago the data updated",
        status_codes_no_grid_is_warning: "Grid warning indicator (Refer to the README for more info)",
        parallel_average_voltage: "When using multiple inverters, show the average battery and voltages",
        parallel_parallel_first: "When using multiple inverters, show the parallel option first",
        grid_flow_reverse: "Reverse the power flow of the `grid_flow` entity/entities",
      };
      return labels[schema.name] || schema.label || schema.name;
    }
  
    _valueChanged(ev) {
      const detail = ev.detail;
  
      // Config collections
      this._config.grid_indicator = this._config.grid_indicator ?? {};
      this._config.update_time = this._config.update_time ?? {};
      this._config.status_codes = this._config.status_codes ?? {};
      this._config.parallel = this._config.parallel ?? {};
  
      // Required
      this._config.inverter_count = detail.value.inverter_count
      this._config.battery_soc.entities = detail.value.battery_soc_entities ?? [] ;
      this._config.home_consumption.entities = detail.value.home_consumption_entities ?? [] ;
      this._config.grid_flow.entities = detail.value.grid_flow_entities ?? [] ;
  
      // Aditional
      this._config.battery_voltage.entities = detail.value.battery_voltage_entities ?? [] ;
      this._config.backup_power.entities = detail.value.backup_power_entities ?? [] ;
      this._config.grid_voltage.entities = detail.value.grid_voltage_entities ?? [] ;
      this._config.update_time.entities = detail.value.update_time_entities ?? [] ;
      this._config.status_codes.entities = detail.value.status_codes_entities ?? [] ;
      this._config.temp.entities = detail.value.temp_entities ?? [] ;
      this._config.energy_allocations.entities = detail.value.energy_allocations_entities ?? [] ;
  
      // PV Power
      this._config.pv_power.entities = detail.value.solar_combined_entities ?? [] ;
  
      // Optional
      this._config.title = detail.value.title ?? "" ;
      this._config.lux_dongle = detail.value.lux_dongle ?? [] ;
      this._config.inverter_alias = detail.value.inverter_alias ?? [] ;
      this._config.refresh_button = detail.value.refresh_button ?? "" ;
      this._config.grid_indicator.hue = detail.value.grid_indicator_hue;
      this._config.grid_indicator.dot = detail.value.grid_indicator_dot;
      this._config.update_time.show_last_update = detail.value.update_time_show_last_update;
      this._config.status_codes.no_grid_is_warning = detail.value.status_codes_no_grid_is_warning;
      this._config.parallel.average_voltage = detail.value.parallel_average_voltage;
      this._config.parallel.parallel_first = detail.value.parallel_parallel_first;
      this._config.grid_flow.reverse = detail.value.grid_flow_reverse;
  
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: this._config },
          bubbles: true,
          composed: true,
        })
      );
    }
  }
  
  customElements.define("lux-power-distribution-card-editor", LuxPowerDistributionCardEditor);
  