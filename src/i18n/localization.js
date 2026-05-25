export function createLocalization({ state, i18n }) {
  const localeBundle = () => i18n[state.language] ?? i18n.en;
  const t = (key) => localeBundle()[key] ?? i18n.en[key] ?? key;

  function localizeEntity(entity, key) {
    const value = entity?.[key];
    if (typeof value === 'string' && value.startsWith('@i18n:')) {
      const token = value.slice(6);
      return entity?.translations?.[state.language]?.[token]
        ?? entity?.translations?.en?.[token]
        ?? token;
    }
    return entity?.translations?.[state.language]?.[key] ?? entity?.translations?.en?.[key] ?? value;
  }

  return {
    localeBundle,
    t,
    localizeEntity
  };
}
