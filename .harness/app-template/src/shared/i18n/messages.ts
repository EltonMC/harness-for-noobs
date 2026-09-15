// User-facing copy lives here, never inline in components. Keys are English and
// grouped by feature; every catalog must define every key (the compiler enforces it).
const ptBR = {
  'errors.title': 'Algo deu errado',
  'errors.unexpected': 'Não foi possível concluir. Tente de novo em instantes.',
  'errors.network': 'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
  'errors.forbidden': 'Você não tem permissão para ver ou alterar isto.',
  'errors.notFound': 'Não encontramos o que você procurou.',
  'navigation.home': 'Voltar para o início',
  'navigation.notFoundTitle': 'Página não encontrada',
} as const;

export type MessageKey = keyof typeof ptBR;
type Catalog = Record<MessageKey, string>;

const enUS: Catalog = {
  'errors.title': 'Something went wrong',
  'errors.unexpected': 'We could not finish that. Please try again in a moment.',
  'errors.network': 'No connection to the server. Check your internet and try again.',
  'errors.forbidden': 'You do not have permission to see or change this.',
  'errors.notFound': 'We could not find what you were looking for.',
  'navigation.home': 'Back to home',
  'navigation.notFoundTitle': 'Page not found',
};

const esES: Catalog = {
  'errors.title': 'Algo salió mal',
  'errors.unexpected': 'No pudimos completarlo. Inténtalo de nuevo en unos instantes.',
  'errors.network': 'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
  'errors.forbidden': 'No tienes permiso para ver o cambiar esto.',
  'errors.notFound': 'No encontramos lo que buscabas.',
  'navigation.home': 'Volver al inicio',
  'navigation.notFoundTitle': 'Página no encontrada',
};

export const catalogs = { 'pt-BR': ptBR, 'en-US': enUS, 'es-ES': esES } satisfies Record<string, Catalog>;

export type ProductLocale = keyof typeof catalogs;
