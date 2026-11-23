import { LitElement, html, css, nothing, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { EDITOR_NAME } from './const';
import { collectWarnings, isIncomplete, LuxCardConfig, validateConfig } from './config';
import { HomeAssistant, LovelaceCardEditor } from './lib/types';

type ConfigObject = Record<string, any>;
type FormSchema = { name: string; label?: string; required?: boolean; selector: Record<string, unknown> };

// Per-inverter lists the editor shows. They are trimmed when the inverter count goes down,
// otherwise the hidden extra entries would fail validation with no way to remove them in the UI.
const EDITOR_LISTS = [
  'battery.soc_entities',
  'battery.flow_entities',
  'battery.charge_live_entities',
  'battery.discharge_live_entities',
  'battery.voltage_entities',
  'grid.flow_entities',
  'grid.voltage_entities',
  'consumption.home_entities',
  'pv.combined_entities',
  'pv.array_1_entities',
  'pv.array_2_entities',
  'pv.array_3_entities',
  'battery.capacity_ah_entities',
  'grid.generator_power_entities',
  'grid.generator_voltage_entities',
  'consumption.backup_entities',
  'temp.entities',
  'update_time.entities',
  'status_codes.entities',
  'parallel.aliases',
  'refresh.lux_dongles',
];

function getParent(obj: ConfigObject, path: string, create: boolean): [ConfigObject | undefined, string] {
  const keys = path.split('.');
  let current: ConfigObject = obj;
  for (const key of keys.slice(0, -1)) {
    if (current[key] === undefined) {
      if (!create) return [undefined, keys[keys.length - 1]];
      current[key] = {};
    }
    current = current[key];
  }
  return [current, keys[keys.length - 1]];
}

// Only ha-form and its selectors are used: HA's other internal elements (ha-textfield,
// ha-formfield, ...) are not public API and have been removed in recent versions.
@customElement(EDITOR_NAME)
export class LuxPowerDistributionCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config?: LuxCardConfig;
  // Which sections are open. Closed ones aren't rendered: with dozens of entity pickers, drawing
  // hidden ones made every change take seconds.
  @state() private _open: Record<string, boolean> = {};

  public setConfig(config: LuxCardConfig): void {
    this._config = config;
  }

  // Config objects from HA may be frozen, so always edit a deep copy.
  private _update(mutate: (config: ConfigObject) => void): void {
    if (!this._config) return;
    const newConfig = JSON.parse(JSON.stringify(this._config));
    mutate(newConfig);
    this._config = newConfig;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: newConfig },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _setValue(path: string, value: unknown): void {
    this._update((config) => {
      const [parent, key] = getParent(config, path, value !== undefined);
      if (!parent) return;
      if (value === undefined) {
        delete parent[key];
        // Don't leave empty sections (e.g. `refresh: {}` or `grid.indicators: {}`) behind.
        const keys = path.split('.');
        for (let depth = keys.length - 1; depth > 0; depth--) {
          const [holder, name] = getParent(config, keys.slice(0, depth).join('.'), false);
          if (!holder || Object.keys(holder[name] ?? {}).length > 0) break;
          delete holder[name];
        }
      } else parent[key] = value;
    });
  }

  private _basicChanged(value: ConfigObject): void {
    if ((value.title || undefined) !== this._config?.title) this._setValue('title', value.title || undefined);

    const count = Number(value.inverter_count);
    // Ignore half-typed values (e.g. an empty field) rather than writing an invalid count.
    if (!Number.isInteger(count) || count < 1 || count === this._config?.inverter_count) return;
    this._update((config) => {
      config.inverter_count = count;
      for (const path of EDITOR_LISTS) {
        const [parent, key] = getParent(config, path, false);
        if (parent && Array.isArray(parent[key])) parent[key] = parent[key].slice(0, count);
      }
      if (config.battery?.shared_index >= count) delete config.battery.shared_index;
      // inverter_actions must match the count, so pad new inverters with 'none' (use the fallback).
      const actions = config.refresh?.inverter_actions;
      if (Array.isArray(actions) && count == 1) {
        // One inverter has no per-inverter pickers, so fold its action into the main one (same
        // behaviour, but visible and editable again).
        const own = actions[0];
        if (
          own?.action &&
          own.action !== 'none' &&
          !(config.refresh.action?.action && config.refresh.action.action !== 'none')
        ) {
          config.refresh.action = own;
        }
        delete config.refresh.inverter_actions;
      } else if (Array.isArray(actions)) {
        config.refresh.inverter_actions = Array.from({ length: count }, (_, i) => actions[i] ?? { action: 'none' });
      }
    });
  }

  private _inverterActionsChanged(value: ConfigObject, count: number): void {
    const current = this._config?.refresh?.inverter_actions;
    const list = Array.from({ length: count }, (_, i) => {
      const action = value[String(i)];
      return action?.action ? action : { action: 'none' };
    });
    // Leave the key out entirely while no inverter has its own action.
    const next = list.some((action) => action.action !== 'none') ? list : undefined;
    if (JSON.stringify(next) !== JSON.stringify(current)) this._setValue('refresh.inverter_actions', next);
  }

  private _entityChanged(path: string, index: number, value: string, optional: boolean): void {
    this._update((config) => {
      const [parent, key] = getParent(config, path, true);
      const list: string[] = Array.isArray(parent![key]) ? parent![key] : [];
      // Pad with '' so a later inverter can be picked first without leaving null holes.
      while (list.length < index) list.push('');
      list[index] = value;
      parent![key] = list;

      // Drop an optional list (and its section) once every entry is cleared.
      if (optional && list.every((entity) => !entity)) {
        delete parent![key];
        const section = path.split('.')[0];
        if (Object.keys(config[section]).length === 0) delete config[section];
      }
    });
  }

  private _toggleBatteryFlowMode(useSeparate: boolean): void {
    this._update((config) => {
      config.battery = config.battery || {};
      if (useSeparate) {
        delete config.battery.flow_entities;
        config.battery.charge_live_entities = config.battery.charge_live_entities || [];
        config.battery.discharge_live_entities = config.battery.discharge_live_entities || [];
      } else {
        delete config.battery.charge_live_entities;
        delete config.battery.discharge_live_entities;
        config.battery.flow_entities = config.battery.flow_entities || [];
      }
    });
  }

  // Hands ha-form the same schema/data objects as last time when their content is unchanged, so
  // unchanged forms (and their entity pickers, which are slow to redraw) are skipped on updates.
  private _memo = new Map<string, unknown>();

  private _same<T>(value: T): T {
    const key = JSON.stringify(value);
    const cached = this._memo.get(key);
    if (cached !== undefined) return cached as T;
    if (this._memo.size > 500) this._memo.clear();
    this._memo.set(key, value);
    return value;
  }

  private _renderForm(schema: FormSchema[], data: ConfigObject, onChange: (value: ConfigObject) => void) {
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._same(data)}
        .schema=${this._same(schema)}
        .computeLabel=${(item: FormSchema) => item.label ?? item.name}
        @value-changed=${(ev: CustomEvent) => {
          ev.stopPropagation();
          onChange(ev.detail.value);
        }}
      ></ha-form>
    `;
  }

  private _renderEntityPickers(
    label: string,
    path: string,
    entities: string[] | undefined,
    count: number,
    optional = false,
  ): TemplateResult {
    const list = entities || [];
    const schema: FormSchema[] = Array.from({ length: count }, (_, i) => ({
      name: String(i),
      label: count > 1 ? `Inverter ${i + 1}` : 'Entity',
      selector: { entity: {} },
    }));
    const data: ConfigObject = {};
    list.forEach((entity, i) => {
      if (entity) data[String(i)] = entity;
    });
    return html`
      <div class="entity-group">
        <div class="entity-label">${label}</div>
        ${this._renderForm(schema, data, (value) => {
          // ha-form returns every field; apply the one that changed.
          for (let i = 0; i < count; i++) {
            const entity = value[String(i)] || '';
            if (entity !== (list[i] || '')) this._entityChanged(path, i, entity, optional);
          }
        })}
      </div>
    `;
  }

  // One text field per inverter, e.g. aliases or dongle serial numbers.
  private _renderTextList(label: string, path: string, values: string[] | undefined, count: number): TemplateResult {
    const list = values || [];
    const schema: FormSchema[] = Array.from({ length: count }, (_, i) => ({
      name: String(i),
      label: count > 1 ? `Inverter ${i + 1}` : 'Value',
      selector: { text: {} },
    }));
    const data: ConfigObject = {};
    list.forEach((value, i) => {
      if (value) data[String(i)] = value;
    });
    return html`
      <div class="entity-group">
        <div class="entity-label">${label}</div>
        ${this._renderForm(schema, data, (value) => {
          for (let i = 0; i < count; i++) {
            const text = (value[String(i)] || '').trim();
            if (text !== (list[i] || '')) this._entityChanged(path, i, text, true);
          }
        })}
      </div>
    `;
  }

  private _renderEntity(label: string, path: string, entity: string | undefined): TemplateResult {
    return this._renderForm([{ name: 'entity', label, selector: { entity: {} } }], { entity }, (value) =>
      this._setValue(path, value.entity || undefined),
    );
  }

  // A number; clearing it (or entering the default) leaves the option out of the YAML.
  private _renderNumber(
    label: string,
    path: string,
    value: number | undefined,
    options: { min: number; max: number; step?: number; unit?: string; defaultValue?: number },
  ): TemplateResult {
    const { defaultValue, ...number } = options;
    return this._renderForm(
      [{ name: 'value', label, selector: { number: { mode: 'box', ...number, unit_of_measurement: number.unit } } }],
      { value: value ?? defaultValue },
      (changed) => {
        const next = changed.value === '' || changed.value == null ? undefined : Number(changed.value);
        this._setValue(path, next === undefined || next === defaultValue || Number.isNaN(next) ? undefined : next);
      },
    );
  }

  // A dropdown; the first option is the default and is left out of the YAML.
  private _renderSelect(
    label: string,
    path: string,
    value: string | number | undefined,
    options: { value: string; label: string }[],
    toConfig: (selected: string) => unknown = (selected) => selected,
  ): TemplateResult {
    return this._renderForm(
      [{ name: 'value', label, selector: { select: { mode: 'dropdown', options } } }],
      { value: value === undefined ? options[0].value : String(value) },
      (changed) => this._setValue(path, changed.value === options[0].value ? undefined : toConfig(changed.value)),
    );
  }

  // Status codes as "64, 136".
  private _renderCodes(label: string, path: string, codes: number[] | undefined): TemplateResult {
    return this._renderForm(
      [{ name: 'value', label, selector: { text: {} } }],
      { value: (codes ?? []).join(', ') },
      (changed) => {
        const list = String(changed.value ?? '')
          .split(/[,\s]+/)
          .filter(Boolean)
          .map(Number)
          .filter((code) => Number.isInteger(code));
        this._setValue(path, list.length ? list : undefined);
      },
    );
  }

  // A collapsed area inside a section, for the less common options.
  private _advanced(key: string, title: string, content: TemplateResult): TemplateResult {
    const open = this._isOpen(key, false);
    return html`
      <details class="advanced" ?open=${open} @toggle=${(ev: Event) => this._toggled(key, false, ev)}>
        <summary>${title}</summary>
        ${open ? html`<div class="advanced-body">${content}</div>` : nothing}
      </details>
    `;
  }

  private _renderSwitch(label: string, path: string, checked: boolean | undefined): TemplateResult {
    return this._renderForm(
      [{ name: 'value', label, selector: { boolean: {} } }],
      { value: checked || false },
      // Leave false out of the YAML, it is the default.
      (value) => this._setValue(path, value.value || undefined),
    );
  }

  private _isOpen(key: string, byDefault: boolean): boolean {
    return this._open[key] ?? byDefault;
  }

  private _toggled(key: string, byDefault: boolean, ev: Event): void {
    const open = (ev.target as HTMLDetailsElement).open;
    if (open !== this._isOpen(key, byDefault)) this._open = { ...this._open, [key]: open };
  }

  // A collapsible section. Native <details>, so it doesn't depend on HA's internal elements.
  private _section(title: string, content: TemplateResult, byDefault = true): TemplateResult {
    const open = this._isOpen(title, byDefault);
    return html`
      <details class="section" ?open=${open} @toggle=${(ev: Event) => this._toggled(title, byDefault, ev)}>
        <summary class="section-header">${title}</summary>
        ${open ? html`<div class="section-body">${content}</div>` : nothing}
      </details>
    `;
  }

  // What the card still needs and what it would ignore (same checks as the card), above the sections.
  private _renderSetupHint(config: LuxCardConfig): TemplateResult {
    let problem: TemplateResult | typeof nothing = nothing;
    try {
      validateConfig(config);
    } catch (err) {
      const kind = isIncomplete(err) ? 'todo' : 'error';
      problem = html`<div class="hint ${kind}">${kind === 'todo' ? 'To finish: ' : ''}${(err as Error).message}</div>`;
    }
    const warnings = collectWarnings(config);
    return html`${problem}${
      warnings.length
        ? html`<div class="hint warning">${warnings.map((warning) => html`<div>⚠ ${warning}</div>`)}</div>`
        : nothing
    }`;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;

    const config = this._config;
    const inverterCount = config.inverter_count || 1;
    // Decide by which keys exist, not by list length, so the switch stays on while the new lists are still empty.
    const useSeparateFlow =
      config.battery?.charge_live_entities !== undefined || config.battery?.discharge_live_entities !== undefined;

    const multi = inverterCount > 1;
    const inverterName = (i: number) => config.parallel?.aliases?.[i] || `Inverter ${i + 1}`;

    return html`
      <div class="card-config">
        ${this._renderSetupHint(config)}
        ${this._section(
          'Basic Settings',
          html`${this._renderForm(
            [
              { name: 'title', label: 'Card Title (optional)', selector: { text: {} } },
              {
                name: 'inverter_count',
                label: 'Inverter Count',
                required: true,
                selector: { number: { min: 1, max: 10, mode: 'box' } },
              },
            ],
            { title: config.title || '', inverter_count: inverterCount },
            (value) => this._basicChanged(value),
          )}
          ${
            multi
              ? html`${this._renderTextList(
                  'Inverter names (optional, shown in the selector)',
                  'parallel.aliases',
                  config.parallel?.aliases,
                  inverterCount,
                )}
                ${this._renderSwitch('Show Parallel first in the selector', 'parallel.parallel_first', config.parallel?.parallel_first)}`
              : nothing
          }`,
        )}
        ${this._section(
          'Battery Configuration',
          html`${this._renderEntityPickers(
            'SOC Entities (required)',
            'battery.soc_entities',
            config.battery?.soc_entities,
            inverterCount,
          )}
          ${this._renderForm(
            [{ name: 'separate', label: 'Use separate charge/discharge entities', selector: { boolean: {} } }],
            { separate: useSeparateFlow },
            (value) => {
              if (value.separate !== useSeparateFlow) this._toggleBatteryFlowMode(value.separate);
            },
          )}
          ${
            useSeparateFlow
              ? html`
                  ${this._renderEntityPickers(
                    'Charge Entities (required)',
                    'battery.charge_live_entities',
                    config.battery?.charge_live_entities,
                    inverterCount,
                  )}
                  ${this._renderEntityPickers(
                    'Discharge Entities (required)',
                    'battery.discharge_live_entities',
                    config.battery?.discharge_live_entities,
                    inverterCount,
                  )}
                `
              : this._renderEntityPickers(
                  'Flow Entities (required)',
                  'battery.flow_entities',
                  config.battery?.flow_entities,
                  inverterCount,
                )
          }
          ${this._renderEntityPickers(
            'Voltage Entities (optional)',
            'battery.voltage_entities',
            config.battery?.voltage_entities,
            inverterCount,
            true,
          )}
          ${this._renderSwitch('Show battery voltage with 1 decimal', 'battery.voltage_decimal', config.battery?.voltage_decimal)}
          ${this._renderSwitch('Invert battery flow direction', 'battery.invert_flow', config.battery?.invert_flow)}
          ${
            inverterCount > 1
              ? this._renderSwitch(
                  'One battery bank shared by all inverters (reads it from inverter 1, or battery.shared_index)',
                  'battery.shared',
                  config.battery?.shared,
                )
              : nothing
          }
          ${
            multi && config.battery?.shared
              ? this._renderSelect(
                  'Inverter that reports the shared battery',
                  'battery.shared_index',
                  config.battery?.shared_index,
                  Array.from({ length: inverterCount }, (_, i) => ({ value: String(i), label: inverterName(i) })),
                  Number,
                )
              : nothing
          }
          ${this._advanced(
            'battery-runtime',
            'Runtime estimate',
            html`<div class="note">Needs the voltage entities above and the capacity below.</div>
              ${this._renderEntityPickers(
                'Capacity (Ah) Entities',
                'battery.capacity_ah_entities',
                config.battery?.capacity_ah_entities,
                inverterCount,
                true,
              )}
              ${this._renderSelect('Show the runtime', 'battery.runtime_location', config.battery?.runtime_location, [
                { value: 'none', label: 'Not shown' },
                { value: 'bottom', label: 'Below the diagram' },
                { value: 'left', label: 'Next to the battery' },
                { value: 'both', label: 'Both' },
              ])}
              ${this._renderNumber(
                'Depth of discharge',
                'battery.depth_of_discharge',
                config.battery?.depth_of_discharge,
                {
                  min: 0,
                  max: 99,
                  unit: '%',
                  defaultValue: 20,
                },
              )}
              ${this._renderNumber('Charge target', 'battery.charge_target_soc', config.battery?.charge_target_soc, {
                min: 1,
                max: 150,
                unit: '%',
                defaultValue: 90,
              })}
              ${
                (config.battery?.charge_target_soc ?? 0) > 100
                  ? html`<div class="hint warning">
                      ⚠ Above 100%: this is accepted (e.g. for inverters that charge to 101% for top balancing), and the
                      charge time is calculated up to ${config.battery!.charge_target_soc}%.
                    </div>`
                  : nothing
              }`,
          )}
          ${
            multi
              ? this._advanced(
                  'battery-parallel',
                  'Parallel view',
                  html`${this._renderSwitch(
                    'Show the average battery voltage',
                    'battery.parallel_average_voltage',
                    config.battery?.parallel_average_voltage,
                  )}
                  ${this._renderEntity('Combined battery flow (history graph)', 'battery.parallel_flow_entity', config.battery?.parallel_flow_entity)}
                  ${this._renderEntity('Combined battery SOC', 'battery.parallel_soc_entity', config.battery?.parallel_soc_entity)}
                  ${this._renderSwitch(
                    'Show the combined SOC instead of the average',
                    'battery.show_parallel_soc_entity',
                    Boolean(config.battery?.show_parallel_soc_entity),
                  )}`,
                )
              : nothing
          }`,
        )}
        ${this._section(
          'Grid Configuration',
          html`${this._renderEntityPickers(
            'Flow Entities (required)',
            'grid.flow_entities',
            config.grid?.flow_entities,
            inverterCount,
          )}
          ${this._renderEntityPickers(
            'Voltage Entities (optional)',
            'grid.voltage_entities',
            config.grid?.voltage_entities,
            inverterCount,
            true,
          )}
          ${this._renderSwitch('Show grid voltage with 1 decimal', 'grid.voltage_decimal', config.grid?.voltage_decimal)}
          ${this._renderSwitch('Invert grid flow direction', 'grid.invert_flow', config.grid?.invert_flow)}
          ${this._renderSwitch('Dim the grid icon when there is no grid voltage', 'grid.indicators.hue', config.grid?.indicators?.hue)}
          ${this._renderSwitch('Show a red dot when there is no grid voltage', 'grid.indicators.dot', config.grid?.indicators?.dot)}
          ${this._advanced(
            'grid-generator',
            'Generator',
            html`<div class="note">
                While the generator produces power and the grid is idle (0 W) or down (0 V), it's shown in the grid's
                place.
              </div>
              ${this._renderEntityPickers(
                'Generator Power Entities',
                'grid.generator_power_entities',
                config.grid?.generator_power_entities,
                inverterCount,
                true,
              )}
              ${this._renderEntityPickers(
                'Generator Voltage Entities',
                'grid.generator_voltage_entities',
                config.grid?.generator_voltage_entities,
                inverterCount,
                true,
              )}
              ${this._renderEntity('Generator Frequency (optional)', 'grid.generator_frequency_entity', config.grid?.generator_frequency_entity)}
              ${this._renderEntity('Generator Voltage THD (optional)', 'grid.generator_thd_entity', config.grid?.generator_thd_entity)}`,
          )}
          ${
            multi
              ? this._advanced(
                  'grid-parallel',
                  'Parallel view',
                  html`${this._renderSwitch(
                    'Show the average grid voltage',
                    'grid.parallel_average_voltage',
                    config.grid?.parallel_average_voltage,
                  )}
                  ${this._renderEntity('Combined grid flow (history graph)', 'grid.parallel_flow_entity', config.grid?.parallel_flow_entity)}`,
                )
              : nothing
          }`,
        )}
        ${this._section(
          'Consumption Configuration',
          html`${this._renderEntityPickers(
              'Home Entities (required)',
              'consumption.home_entities',
              config.consumption?.home_entities,
              inverterCount,
            )}
            ${this._renderEntityPickers(
              'Backup (EPS) Entities (optional, shown when there is no home use)',
              'consumption.backup_entities',
              config.consumption?.backup_entities,
              inverterCount,
              true,
            )}
            <div class="entity-group">
              <div class="entity-label">Allocated Power Entity (optional)</div>
              ${this._renderForm(
                [{ name: 'entity', label: 'Entity', selector: { entity: {} } }],
                { entity: config.consumption?.allocated_power_entity },
                (value) => this._setValue('consumption.allocated_power_entity', value.entity || undefined),
              )}
              <div class="note">
                Create a helper first: Settings > Devices & services > Helpers > Create helper > Group > Sensor group,
                type Sum, with the power sensors of the devices to show. Then pick that helper here.
              </div>
            </div>
            ${
              multi
                ? this._advanced(
                    'consumption-parallel',
                    'Parallel view',
                    this._renderEntity(
                      'Combined home consumption (history graph)',
                      'consumption.combined_consumption_entity',
                      config.consumption?.combined_consumption_entity,
                    ),
                  )
                : nothing
            }`,
        )}
        ${this._section(
          'Solar/PV Configuration (optional)',
          html`<div class="note">
              Use Combined PV for one total per inverter, or Arrays 1-3 to show each string separately (A1-A3). If both
              are set, the card shows the combined total.
            </div>
            ${this._renderEntityPickers('Combined PV Entities', 'pv.combined_entities', config.pv?.combined_entities, inverterCount, true)}
            ${([1, 2, 3] as const).map((n) =>
              this._renderEntityPickers(
                `Array ${n} Entities`,
                `pv.array_${n}_entities`,
                config.pv?.[`array_${n}_entities`],
                inverterCount,
                true,
              ),
            )}
            ${
              multi
                ? this._advanced(
                    'pv-parallel',
                    'Parallel view',
                    this._renderEntity(
                      'Combined PV (history graph)',
                      'pv.combined_parallel_entity',
                      config.pv?.combined_parallel_entity,
                    ),
                  )
                : nothing
            }`,
          false,
        )}
        ${this._section(
          'Refresh Button (optional)',
          html`${this._renderTextList(
            'LuxPower dongle serial numbers (for the LuxPower refresh)',
            'refresh.lux_dongles',
            config.refresh?.lux_dongles,
            inverterCount,
          )}
          ${this._renderForm(
            [
              {
                name: 'button_location',
                label: 'Button location',
                selector: {
                  select: {
                    mode: 'dropdown',
                    options: [
                      { value: 'none', label: 'No button' },
                      { value: 'left', label: 'Left' },
                      { value: 'right', label: 'Right' },
                      { value: 'both', label: 'Both' },
                    ],
                  },
                },
              },
              {
                name: 'action',
                label:
                  inverterCount > 1
                    ? 'Action for Parallel, and inverters without their own (Nothing = LuxPower dongles)'
                    : 'Action (leave as Nothing to use the LuxPower dongles)',
                selector: { ui_action: { default_action: 'none' } },
              },
            ],
            { button_location: config.refresh?.button_location || 'none', action: config.refresh?.action },
            (value) => {
              const location = value.button_location === 'none' ? undefined : value.button_location;
              if (location !== config.refresh?.button_location) this._setValue('refresh.button_location', location);
              const action = value.action?.action && value.action.action !== 'none' ? value.action : undefined;
              if (JSON.stringify(action) !== JSON.stringify(config.refresh?.action))
                this._setValue('refresh.action', action);
            },
          )}
          ${
            inverterCount > 1
              ? html`
                  <div class="entity-label">Per-inverter actions (optional)</div>
                  ${this._renderForm(
                    Array.from({ length: inverterCount }, (_, i) => ({
                      name: String(i),
                      label: config.parallel?.aliases?.[i] ?? `Inverter ${i + 1}`,
                      selector: { ui_action: { default_action: 'none' } },
                    })),
                    Object.assign(
                      {},
                      ...(config.refresh?.inverter_actions ?? []).map((action, i) =>
                        action?.action && action.action !== 'none' ? { [String(i)]: action } : {},
                      ),
                    ),
                    (value) => this._inverterActionsChanged(value, inverterCount),
                  )}
                `
              : nothing
          }`,
          false,
        )}
        ${this._section(
          'Temperature, Update Time and Status (optional)',
          html`${this._renderEntityPickers('Temperature Entities', 'temp.entities', config.temp?.entities, inverterCount, true)}
          ${this._renderEntityPickers(
            'Last Update Entities',
            'update_time.entities',
            config.update_time?.entities,
            inverterCount,
            true,
          )}
          ${this._renderSwitch('Show the date and time of the last update', 'update_time.show_datetime', config.update_time?.show_datetime)}
          ${this._renderSwitch('Show how long ago it updated', 'update_time.show_time_since', config.update_time?.show_time_since)}
          ${this._renderSwitch(
            "The update entities have a 'timestamp' attribute",
            'update_time.has_timestamp_attribute',
            config.update_time?.has_timestamp_attribute,
          )}
          ${this._renderEntityPickers('Status Code Entities', 'status_codes.entities', config.status_codes?.entities, inverterCount, true)}
          ${this._advanced(
            'status-colours',
            'Status code colours',
            html`<div class="note">Codes, separated by commas, to show as normal, warning or error.</div>
              ${this._renderCodes('Show as normal', 'status_codes.overwrite_as_normal', config.status_codes?.overwrite_as_normal)}
              ${this._renderCodes('Show as warning', 'status_codes.overwrite_as_warning', config.status_codes?.overwrite_as_warning)}
              ${this._renderCodes('Show as error', 'status_codes.overwrite_as_error', config.status_codes?.overwrite_as_error)}`,
          )}`,
          false,
        )}
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .card-config {
        padding: 16px;
      }
      .section {
        margin-bottom: 16px;
        background: var(--card-background-color, #fff);
        border-radius: 8px;
        border: 1px solid var(--divider-color, #e0e0e0);
      }
      .section-header {
        font-size: 16px;
        font-weight: 500;
        color: var(--primary-text-color);
        padding: 14px 16px;
        cursor: pointer;
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        user-select: none;
      }
      .section-header::-webkit-details-marker {
        display: none;
      }
      .section-header::after {
        content: '';
        width: 8px;
        height: 8px;
        border-right: 2px solid var(--secondary-text-color);
        border-bottom: 2px solid var(--secondary-text-color);
        transform: rotate(45deg);
        transition: transform 0.2s;
        margin-right: 4px;
      }
      details[open] > .section-header {
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      details[open] > .section-header::after {
        transform: rotate(-135deg);
      }
      .section-body {
        padding: 16px;
      }
      .advanced {
        margin: 8px 0 12px;
        border-left: 2px solid var(--divider-color, #e0e0e0);
        padding-left: 12px;
      }
      .advanced > summary {
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: var(--secondary-text-color);
        padding: 6px 0;
        user-select: none;
      }
      .advanced-body {
        padding-top: 8px;
      }
      .hint {
        margin-bottom: 16px;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
      }
      .hint.todo {
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
      }
      .hint.warning {
        background: color-mix(in srgb, var(--warning-color, #ffa600) 15%, transparent);
        color: var(--primary-text-color);
      }
      .hint.error {
        background: color-mix(in srgb, var(--error-color, #db4437) 15%, transparent);
        color: var(--error-color, #db4437);
      }
      .entity-group {
        margin-bottom: 16px;
      }
      .entity-label {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--secondary-text-color);
      }
      ha-form {
        display: block;
        margin-bottom: 8px;
      }
      .note {
        font-size: 13px;
        color: var(--secondary-text-color);
        margin-bottom: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [EDITOR_NAME]: LuxPowerDistributionCardEditor;
  }
}
