// import { html, LitElement, nothing, TemplateResult } from 'lit';
// import { customElement, property, state } from 'lit/decorators.js';
// import { HomeAssistant, LovelaceCardConfig, LovelaceCardEditor } from './lib/types';
// import memoizeOne from 'memoize-one';

// import { EDITOR_NAME } from './const';
// import { LuxCardConfig } from './config';

// export interface ConfigChangedEvent {
//   config: LovelaceCardConfig;
//   error?: string;
//   guiModeAvailable?: boolean;
// }

// declare global {
//   interface HASSDomEvents {
//     'config-changed': ConfigChangedEvent;
//   }
// }

// @customElement(EDITOR_NAME)
// export class LuxPowerDistributionCardEditor extends LitElement implements LovelaceCardEditor {
//   @property({ attribute: false }) public hass?: HomeAssistant;
//   @state() public _config?: LuxCardConfig;

//   setConfig(config: LuxCardConfig) {
//     this._config = { ...config };
//   }

//   protected render(): TemplateResult {
//     if (!this._config) return html``;

//     return html`
//       <div class="card-config">
//         <ha-textfield
//           label="Inverter Count"
//           type="number"
//           .value=${String(this._config.inverter_count || 0)}
//           @input=${(e: Event) => this._updateConfig('inverter_count', parseInt((e.target as HTMLInputElement).value))}
//         ></ha-textfield>
//       </div>
//     `;
//   }

//   private _updateConfig(key: keyof LuxCardConfig, value: any): void {
//     this._config = {
//       ...this._config,
//       [key]: value,
//     };
//     this._fireConfigChanged();
//   }

//   private _fireConfigChanged(): void {
//     fireEvent(this, 'config-changed', { config: this._config });
//   }
// }

// declare global {
//   interface HTMLElementTagNameMap {
//     EDITOR_NAME: LuxPowerDistributionCardEditor;
//   }
// }
