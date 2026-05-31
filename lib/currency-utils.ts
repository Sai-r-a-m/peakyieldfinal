export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

// ISO 3166-1 alpha-2 country code → currency
const COUNTRY_CURRENCY: Record<string, Currency> = {
  // Asia
  IN: { code: 'INR', symbol: '₹',   name: 'Indian Rupee' },
  JP: { code: 'JPY', symbol: '¥',   name: 'Japanese Yen' },
  CN: { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan' },
  TH: { code: 'THB', symbol: '฿',   name: 'Thai Baht' },
  SG: { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar' },
  MY: { code: 'MYR', symbol: 'RM',  name: 'Malaysian Ringgit' },
  ID: { code: 'IDR', symbol: 'Rp',  name: 'Indonesian Rupiah' },
  PH: { code: 'PHP', symbol: '₱',   name: 'Philippine Peso' },
  VN: { code: 'VND', symbol: '₫',   name: 'Vietnamese Dong' },
  KR: { code: 'KRW', symbol: '₩',   name: 'South Korean Won' },
  HK: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  TW: { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar' },
  PK: { code: 'PKR', symbol: '₨',   name: 'Pakistani Rupee' },
  BD: { code: 'BDT', symbol: '৳',   name: 'Bangladeshi Taka' },
  LK: { code: 'LKR', symbol: '₨',   name: 'Sri Lankan Rupee' },
  NP: { code: 'NPR', symbol: '₨',   name: 'Nepalese Rupee' },
  // Middle East
  AE: { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  SA: { code: 'SAR', symbol: 'SR',  name: 'Saudi Riyal' },
  QA: { code: 'QAR', symbol: 'QR',  name: 'Qatari Riyal' },
  KW: { code: 'KWD', symbol: 'KD',  name: 'Kuwaiti Dinar' },
  BH: { code: 'BHD', symbol: 'BD',  name: 'Bahraini Dinar' },
  OM: { code: 'OMR', symbol: 'OMR', name: 'Omani Rial' },
  TR: { code: 'TRY', symbol: '₺',   name: 'Turkish Lira' },
  IL: { code: 'ILS', symbol: '₪',   name: 'Israeli Shekel' },
  // Europe
  GB: { code: 'GBP', symbol: '£',   name: 'British Pound' },
  CH: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  NO: { code: 'NOK', symbol: 'kr',  name: 'Norwegian Krone' },
  SE: { code: 'SEK', symbol: 'kr',  name: 'Swedish Krona' },
  DK: { code: 'DKK', symbol: 'kr',  name: 'Danish Krone' },
  PL: { code: 'PLN', symbol: 'zł',  name: 'Polish Zloty' },
  CZ: { code: 'CZK', symbol: 'Kč',  name: 'Czech Koruna' },
  HU: { code: 'HUF', symbol: 'Ft',  name: 'Hungarian Forint' },
  RO: { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  // Euro zone (sampled — all map to EUR)
  DE: { code: 'EUR', symbol: '€',   name: 'Euro' },
  FR: { code: 'EUR', symbol: '€',   name: 'Euro' },
  IT: { code: 'EUR', symbol: '€',   name: 'Euro' },
  ES: { code: 'EUR', symbol: '€',   name: 'Euro' },
  PT: { code: 'EUR', symbol: '€',   name: 'Euro' },
  NL: { code: 'EUR', symbol: '€',   name: 'Euro' },
  BE: { code: 'EUR', symbol: '€',   name: 'Euro' },
  AT: { code: 'EUR', symbol: '€',   name: 'Euro' },
  GR: { code: 'EUR', symbol: '€',   name: 'Euro' },
  FI: { code: 'EUR', symbol: '€',   name: 'Euro' },
  IE: { code: 'EUR', symbol: '€',   name: 'Euro' },
  // Americas
  US: { code: 'USD', symbol: '$',   name: 'US Dollar' },
  CA: { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar' },
  AU: { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar' },
  NZ: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  MX: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  BR: { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real' },
  AR: { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso' },
  CL: { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso' },
  CO: { code: 'COP', symbol: 'CO$', name: 'Colombian Peso' },
  PE: { code: 'PEN', symbol: 'S/.',  name: 'Peruvian Sol' },
  // Africa
  ZA: { code: 'ZAR', symbol: 'R',   name: 'South African Rand' },
  NG: { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira' },
  KE: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  EG: { code: 'EGP', symbol: 'E£',  name: 'Egyptian Pound' },
  MA: { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham' },
};

const USD: Currency = { code: 'USD', symbol: '$', name: 'US Dollar' };

export function getCurrencyForCountry(countryCode: string): Currency {
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? USD;
}

export function formatPrice(amount: number, currency: Currency): string {
  const rounded = Math.round(amount);
  return `${currency.symbol}${rounded.toLocaleString('en-US')}`;
}
