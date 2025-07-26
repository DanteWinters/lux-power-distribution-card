import {
  HassEntities,
  HassConfig,
  Auth,
  Connection,
  MessageBase,
  HassServices,
  HassServiceTarget,
} from 'home-assistant-js-websocket';

export interface HomeAssistant {
  auth: Auth;
  connection: Connection;
  connected: boolean;
  states: HassEntities;
  services: HassServices;
  config: HassConfig;
  selectedTheme?: string | null;
  panelUrl: string;
  language: string;
  selectedLanguage: string | null;

  dockedSidebar: boolean;
  moreInfoEntityId: string;
  callApi: <T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: { [key: string]: any }
  ) => Promise<T>;
  fetchWithAuth: (path: string, init?: { [key: string]: any }) => Promise<Response>;
  sendWS: (msg: MessageBase) => Promise<void>;
  callWS: <T>(msg: MessageBase) => Promise<T>;
}

interface LovelaceBadgeConfig {
  type?: string;
  [key: string]: any;
}

interface ShowViewConfig {
  user?: string;
}

interface LovelaceViewConfig {
  index?: number;
  title?: string;
  badges?: Array<string | LovelaceBadgeConfig>;
  cards?: LovelaceCardConfig[];
  path?: string;
  icon?: string;
  theme?: string;
  panel?: boolean;
  background?: string;
  visible?: boolean | ShowViewConfig[];
}

export interface LovelaceCardConfig {
  index?: number;
  view_index?: number;
  view_layout?: any;
  type: string;
  [key: string]: any;
}

interface LovelaceConfig {
  title?: string;
  views: LovelaceViewConfig[];
  background?: string;
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  isPanel?: boolean;
  editMode?: boolean;
  getCardSize(): number | Promise<number>;
  setConfig(config: LovelaceCardConfig): void;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: LovelaceConfig;
  setConfig(config: LovelaceCardConfig): void;
}
