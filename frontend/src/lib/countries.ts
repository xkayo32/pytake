export interface Country {
  code: string;
  name: string;
  flag: string;
  phoneCode: string;
}

export const countries: Country[] = [
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', phoneCode: '+55' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', phoneCode: '+1' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', phoneCode: '+54' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', phoneCode: '+56' },
  { code: 'CO', name: 'Colômbia', flag: '🇨🇴', phoneCode: '+57' },
  { code: 'MX', name: 'México', flag: '🇲🇽', phoneCode: '+52' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', phoneCode: '+51' },
  { code: 'PY', name: 'Paraguai', flag: '🇵🇾', phoneCode: '+595' },
  { code: 'UY', name: 'Uruguai', flag: '🇺🇾', phoneCode: '+598' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', phoneCode: '+351' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸', phoneCode: '+34' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧', phoneCode: '+44' },
  { code: 'FR', name: 'França', flag: '🇫🇷', phoneCode: '+33' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪', phoneCode: '+49' },
  { code: 'IT', name: 'Itália', flag: '🇮🇹', phoneCode: '+39' },
];

export const defaultCountry = countries[0]; // Brasil
