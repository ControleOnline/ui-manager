const safeArray = value => (Array.isArray(value) ? value : []);

const entityId = value => String(value?.id || value?.['@id'] || value || '')
  .split('/')
  .filter(Boolean)
  .pop() || '';

export const collectMenuCostsComponentRecordIds = nodes => Array.from(new Set(
  safeArray(nodes)
    .map(node => entityId(node?.refId))
    .filter(Boolean),
));

// Carrega as identidades em fila para respeitar o store e o loading central do sistema.
export const fetchMenuCostsComponentRecords = async ({ ids, productsActions } = {}) => {
  if (typeof productsActions?.get !== 'function') return [];

  const records = [];
  for (const id of collectMenuCostsComponentRecordIds(safeArray(ids).map(refId => ({ refId })))) {
    try {
      const record = await productsActions.get(id);
      if (record && typeof record === 'object') records.push(record);
    } catch {
      // A referência ausente continua visível como pendência técnica na composição.
    }
  }

  return records;
};

export const indexMenuCostsComponentRecords = records => Object.fromEntries(
  safeArray(records)
    .map(record => [entityId(record), record])
    .filter(([id]) => id),
);
