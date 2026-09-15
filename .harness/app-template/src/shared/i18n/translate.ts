import { catalogs, type MessageKey, type ProductLocale } from './messages';

export const productLocale: ProductLocale = '__PRODUCT_LOCALE__';

type MessageParameters = Record<string, string | number>;

// Replaces {name} placeholders; a missing parameter stays visible so tests catch it.
export function formatMessage(template: string, parameters: MessageParameters) {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in parameters ? String(parameters[name]) : placeholder,
  );
}

export function translate(key: MessageKey, parameters: MessageParameters = {}) {
  return formatMessage(catalogs[productLocale][key], parameters);
}
