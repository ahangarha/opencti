const RTL_LANGUAGES = new Set(['fa']);

export const isRtlLanguage = (lang: string) => RTL_LANGUAGES.has(lang);
