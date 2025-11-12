'use client';

import { useState } from 'react';
import {
  Palette,
  Moon,
  Sun,
  Globe,
  Settings,
  Check,
} from 'lucide-react';

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  compact_view: boolean;
  animations: boolean;
  color_scheme: 'indigo' | 'purple' | 'blue' | 'green';
}

const themes = [
  {
    id: 'light',
    label: 'Claro',
    icon: Sun,
    description: 'Interface clara com fundo branco',
  },
  {
    id: 'dark',
    label: 'Escuro',
    icon: Moon,
    description: 'Interface escura para reduzir fadiga ocular',
  },
  {
    id: 'auto',
    label: 'Automático',
    icon: Settings,
    description: 'Segue a preferência do seu sistema',
  },
];

const languages = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'fr-FR', label: 'Français' },
];

const timezones = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+10)' },
];

const colorSchemes = [
  {
    id: 'indigo',
    label: 'Indigo',
    preview: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
  },
  {
    id: 'purple',
    label: 'Purple',
    preview: 'bg-gradient-to-r from-purple-500 to-purple-600',
  },
  {
    id: 'blue',
    label: 'Blue',
    preview: 'bg-gradient-to-r from-blue-500 to-blue-600',
  },
  {
    id: 'green',
    label: 'Green',
    preview: 'bg-gradient-to-r from-green-500 to-green-600',
  },
];

export default function AppearancePage() {
  const [settings, setSettings] = useState<AppearanceSettings>({
    theme: 'auto',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    compact_view: false,
    animations: true,
    color_scheme: 'indigo',
  });

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    setSettings({ ...settings, theme });
  };

  const handleLanguageChange = (language: string) => {
    setSettings({ ...settings, language });
  };

  const handleTimezoneChange = (timezone: string) => {
    setSettings({ ...settings, timezone });
  };

  const handleColorSchemeChange = (scheme: string) => {
    setSettings({ ...settings, color_scheme: scheme as any });
  };

  const handleToggle = (key: keyof AppearanceSettings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings({ ...settings, [key]: !settings[key] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Aparência
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize o tema, idioma e personalização da interface
        </p>
      </div>

      {/* Theme Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((theme) => {
            const Icon = theme.icon;
            return (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id as any)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.theme === theme.id
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="h-8 w-8 mx-auto mb-2 text-gray-700 dark:text-gray-300" />
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  {theme.label}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {theme.description}
                </p>
                {settings.theme === theme.id && (
                  <div className="mt-2 flex justify-center">
                    <Check className="h-5 w-5 text-indigo-600" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Scheme */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Esquema de Cores
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {colorSchemes.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => handleColorSchemeChange(scheme.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                settings.color_scheme === scheme.id
                  ? 'border-gray-900 dark:border-white'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className={`h-12 rounded-lg ${scheme.preview} mb-2`} />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {scheme.label}
              </p>
              {settings.color_scheme === scheme.id && (
                <div className="mt-2 flex justify-center">
                  <Check className="h-5 w-5 text-indigo-600" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4 mb-4">
          <Globe className="h-6 w-6 text-gray-600 dark:text-gray-400 mt-1" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Idioma
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Selecione o idioma da interface
            </p>
          </div>
        </div>
        <select
          value={settings.language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-colors"
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Timezone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4 mb-4">
          <Settings className="h-6 w-6 text-gray-600 dark:text-gray-400 mt-1" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Fuso Horário
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configure o fuso horário para sua localização
            </p>
          </div>
        </div>
        <select
          value={settings.timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-colors"
        >
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Compact View */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Visualização Compacta
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Reduza o espaçamento e tamanho das fontes
            </p>
          </div>
          <button
            onClick={() => handleToggle('compact_view')}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              settings.compact_view
                ? 'bg-indigo-600'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                settings.compact_view ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Animations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Animações
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Habilitar animações e transições da interface
            </p>
          </div>
          <button
            onClick={() => handleToggle('animations')}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              settings.animations
                ? 'bg-indigo-600'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                settings.animations ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Pré-visualização
        </h2>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded w-1/3" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Salvar Preferências
        </button>
        <button className="px-6 py-2 border border-gray-200 dark:border-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );
}
