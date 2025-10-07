export interface Country {
  code: string;
  name: string;
  phoneCode: string;
  flag: string;
}

export const countries: Country[] = [
  { code: 'BR', name: 'Brasil', phoneCode: '+55', flag: '🇧🇷' },
  { code: 'US', name: 'Estados Unidos', phoneCode: '+1', flag: '🇺🇸' },
  { code: 'AR', name: 'Argentina', phoneCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', phoneCode: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colômbia', phoneCode: '+57', flag: '🇨🇴' },
  { code: 'MX', name: 'México', phoneCode: '+52', flag: '🇲🇽' },
  { code: 'PE', name: 'Peru', phoneCode: '+51', flag: '🇵🇪' },
  { code: 'UY', name: 'Uruguai', phoneCode: '+598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguai', phoneCode: '+595', flag: '🇵🇾' },
  { code: 'BO', name: 'Bolívia', phoneCode: '+591', flag: '🇧🇴' },
  { code: 'VE', name: 'Venezuela', phoneCode: '+58', flag: '🇻🇪' },
  { code: 'EC', name: 'Equador', phoneCode: '+593', flag: '🇪🇨' },
  { code: 'PT', name: 'Portugal', phoneCode: '+351', flag: '🇵🇹' },
  { code: 'ES', name: 'Espanha', phoneCode: '+34', flag: '🇪🇸' },
  { code: 'FR', name: 'França', phoneCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Itália', phoneCode: '+39', flag: '🇮🇹' },
  { code: 'DE', name: 'Alemanha', phoneCode: '+49', flag: '🇩🇪' },
  { code: 'GB', name: 'Reino Unido', phoneCode: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canadá', phoneCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Austrália', phoneCode: '+61', flag: '🇦🇺' },
];

export const defaultCountry = countries[0]; // Brasil
