import {
  cloneSeedData,
  evidenceLabel,
  normalizeSearch,
  safeArray,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/viewModel';

const COMPANY_SUFFIXES = [
  ' ltda',
  ' ltda epp',
  ' epp',
  ' me',
  ' eireli',
  ' s a',
  ' s a ',
  ' s/a',
  ' sa',
];

const MERGE_SUFFIXES = ['embalagens'];

const MOVEMENT_SOURCES = [
  { key: 'purchaseOrders', type: 'purchase', label: 'Compra' },
  { key: 'inputs', type: 'input', label: 'Entrada' },
  { key: 'expenseEntries', type: 'expense', label: 'Despesa' },
];

const normalizeText = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripParentheticalText = value =>
  String(value || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripCompanySuffixes = value => {
  let normalized = normalizeText(stripParentheticalText(value));
  let changed = true;

  while (changed && normalized) {
    changed = false;

    for (const suffix of COMPANY_SUFFIXES) {
      if (normalized.endsWith(suffix)) {
        normalized = normalized.slice(0, -suffix.length).trim();
        changed = true;
      }
    }
  }

  return normalized;
};

const resolveSupplierMergeKey = supplier => {
  const rawName = supplier?.name || supplier?.legalName || supplier?.code || supplier?.id || '';
  return stripCompanySuffixes(rawName);
};

const resolveContactKey = contact =>
  [
    normalizeText(contact?.name || ''),
    normalizeText(contact?.phone || ''),
    normalizeText(contact?.email || ''),
  ]
    .filter(Boolean)
    .join('|');

const buildContactFromSupplier = supplier => {
  const contactName = String(
    supplier?.sellerName ||
      supplier?.name ||
      supplier?.legalName ||
      supplier?.description ||
      '',
  ).trim();
  const phone = String(supplier?.sellerPhone || '').trim();
  const email = String(supplier?.sellerEmail || '').trim();

  if ((!phone && !email) || !contactName) {
    return null;
  }

  return {
    id: `${supplier?.id || resolveSupplierMergeKey(supplier) || 'supplier'}:contact`,
    name: contactName || 'Contato principal',
    phone,
    email,
    sourceId: supplier?.id || '',
    sourceName: supplier?.name || supplier?.legalName || '',
  };
};

const resolveSupplierCompleteness = supplier => {
  const evidenceScores = {
    documented: 4,
    review: 3,
    estimated: 2,
    manual: 1,
  };

  return [
    supplier?.cnpj,
    supplier?.legalName,
    supplier?.address,
    supplier?.city,
    supplier?.state,
    supplier?.sellerName,
    supplier?.sellerPhone,
    supplier?.sellerEmail,
    supplier?.pixKey,
    safeArray(supplier?.paymentMethods).length > 0,
    supplier?.notes,
    supplier?.description,
    evidenceScores[supplier?.evidenceType] || 0,
  ].reduce((score, value) => score + (value ? 1 : 0), 0);
};

const mergeSupplierRecords = (target, source) => {
  const next = {
    ...target,
    sourceRecords: [...safeArray(target.sourceRecords), source],
    sourceIds: Array.from(new Set([...safeArray(target.sourceIds), source?.id].filter(Boolean))),
    sourceNames: Array.from(
      new Set([
        ...safeArray(target.sourceNames),
        source?.name || '',
        source?.legalName || '',
      ].map(value => String(value || '').trim()).filter(Boolean)),
    ),
    paymentMethods: Array.from(
      new Set([
        ...safeArray(target.paymentMethods),
        ...safeArray(source?.paymentMethods),
      ].map(value => String(value || '').trim()).filter(Boolean)),
    ),
    contacts: [...safeArray(target.contacts)],
  };

  const scalarFields = [
    'name',
    'legalName',
    'cnpj',
    'description',
    'category',
    'code',
    'address',
    'cep',
    'city',
    'state',
    'pixKey',
    'pixKeyType',
    'notes',
    'evidenceType',
    'evidenceSource',
  ];

  for (const field of scalarFields) {
    if (!String(next[field] || '').trim() && String(source?.[field] || '').trim()) {
      next[field] = source[field];
    }
  }

  if (resolveSupplierCompleteness(source) > resolveSupplierCompleteness(target)) {
    for (const field of scalarFields) {
      if (String(source?.[field] || '').trim()) {
        next[field] = source[field];
      }
    }
  }

  const contact = buildContactFromSupplier(source);
  if (contact) {
    const key = resolveContactKey(contact);
    const contactIndex = next.contacts.findIndex(item => resolveContactKey(item) === key);
    if (contactIndex >= 0) {
      next.contacts[contactIndex] = {
        ...next.contacts[contactIndex],
        ...contact,
      };
    } else {
      next.contacts.push(contact);
    }
  }

  return next;
};

const resolveMovementLabel = item => {
  if (item?.label) return item.label;
  if (item?.title) return item.title;
  if (item?.description) return item.description;
  if (item?.documentNumber) return `Documento ${item.documentNumber}`;
  return item?.code || item?.id || 'Movimento';
};

const buildMovementRows = (seedData, supplierIdMap) => {
  const rowsBySupplier = new Map();

  for (const [sourceIndex, source] of MOVEMENT_SOURCES.entries()) {
    for (const [itemIndex, item] of safeArray(seedData?.[source.key]).entries()) {
      const supplierId = String(item?.supplierId || '').trim();
      if (!supplierId) continue;

      const supplierKey = supplierIdMap.get(supplierId);
      if (!supplierKey) continue;

      if (!rowsBySupplier.has(supplierKey)) {
        rowsBySupplier.set(supplierKey, []);
      }
      const fallbackKey = `${sourceIndex}-${itemIndex}`;

      rowsBySupplier.get(supplierKey).push({
        id: `${source.type}:${item?.id || item?.code || item?.documentNumber || fallbackKey}`,
        type: source.type,
        label: resolveMovementLabel(item),
        date: item?.date || '',
        amount: Number(item?.totalAmount || 0),
        supplierId,
        supplierName: item?.supplierName || '',
        evidenceType: item?.evidenceType || item?.sourceType || '',
      });
    }
  }

  for (const rows of rowsBySupplier.values()) {
    rows.sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
  }

  return rowsBySupplier;
};

export const buildImportedSuppliers = (seedData = cloneSeedData()) => {
  const rawSuppliers = safeArray(seedData?.suppliers).filter(item => item?.id);
  const groups = new Map();
  const exactKeys = new Map();

  for (const supplier of rawSuppliers) {
    const exactKey = resolveSupplierMergeKey(supplier);
    const normalizedName = normalizeText(supplier?.name || supplier?.legalName || supplier?.code || supplier?.id);
    let resolvedKey = exactKey || normalizedName || String(supplier?.id || '').trim();

    if (!resolvedKey) {
      continue;
    }

    if (!groups.has(resolvedKey)) {
      groups.set(resolvedKey, {
        id: supplier.id,
        key: resolvedKey,
        name: supplier.name || supplier.legalName || supplier.description || supplier.id,
        legalName: supplier.legalName || '',
        cnpj: supplier.cnpj || '',
        code: supplier.code || '',
        description: supplier.description || '',
        category: supplier.category || '',
        address: supplier.address || '',
        cep: supplier.cep || '',
        city: supplier.city || '',
        state: supplier.state || '',
        pixKey: supplier.pixKey || '',
        pixKeyType: supplier.pixKeyType || '',
        notes: supplier.notes || '',
        evidenceType: supplier.evidenceType || '',
        evidenceSource: supplier.evidenceSource || '',
        paymentMethods: Array.from(new Set(safeArray(supplier.paymentMethods).map(value => String(value || '').trim()).filter(Boolean))),
        contacts: [],
        sourceRecords: [supplier],
        sourceIds: [supplier.id],
        sourceNames: [supplier.name || supplier.legalName || ''],
      });
      exactKeys.set(exactKey, resolvedKey);
      const contact = buildContactFromSupplier(supplier);
      if (contact) {
        groups.get(resolvedKey).contacts.push(contact);
      }
      continue;
    }

    const currentGroup = groups.get(resolvedKey);
    groups.set(resolvedKey, mergeSupplierRecords(currentGroup, supplier));
    exactKeys.set(exactKey, resolvedKey);
  }

  for (const supplier of rawSuppliers) {
    const exactKey = resolveSupplierMergeKey(supplier);
    const normalizedName = normalizeText(supplier?.name || supplier?.legalName || supplier?.code || supplier?.id);
    const currentKey = exactKeys.get(exactKey) || normalizedName;

    if (!currentKey) continue;

    for (const existingKey of groups.keys()) {
      if (existingKey === currentKey) continue;

      const shorter = existingKey.length <= currentKey.length ? existingKey : currentKey;
      const longer = existingKey.length > currentKey.length ? existingKey : currentKey;
      if (!longer.startsWith(`${shorter} `)) continue;

      const remainder = longer.slice(shorter.length).trim();
      if (!MERGE_SUFFIXES.includes(remainder)) continue;

      const targetKey = shorter;
      const sourceKey = longer;
      const target = groups.get(targetKey);
      const source = groups.get(sourceKey);
      if (!target || !source) continue;

      groups.set(targetKey, mergeSupplierRecords(target, source));
      groups.delete(sourceKey);
      exactKeys.set(exactKey, targetKey);
    }
  }

  const suppliers = [...groups.values()].map(group => ({
    ...group,
    contacts: group.contacts
      .filter(Boolean)
      .filter((contact, index, array) => index === array.findIndex(item => resolveContactKey(item) === resolveContactKey(contact))),
    sourceIds: Array.from(new Set(safeArray(group.sourceIds).filter(Boolean))),
    sourceNames: Array.from(new Set(safeArray(group.sourceNames).filter(Boolean))),
    paymentMethods: Array.from(new Set(safeArray(group.paymentMethods).filter(Boolean))),
    sourceRecords: safeArray(group.sourceRecords),
  }));

  suppliers.sort((left, right) =>
    String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'),
  );

  const supplierIdMap = new Map();
  for (const supplier of suppliers) {
    for (const sourceId of safeArray(supplier.sourceIds)) {
      supplierIdMap.set(sourceId, supplier.key);
    }
  }

  const movementRows = buildMovementRows(seedData, supplierIdMap);

  return suppliers.map(supplier => {
    const movements = movementRows.get(supplier.key) || [];
    const latest = movements[0] || null;
    return {
      ...supplier,
      contactCount: safeArray(supplier.contacts).length,
      duplicateCount: Math.max(0, safeArray(supplier.sourceIds).length - 1),
      movementCount: movements.length,
      latestMovement: latest,
      latestMovementDate: latest?.date || '',
      latestMovementLabel: latest ? `${latest.label}${latest.amount ? ` · ${latest.amount.toFixed(2)}` : ''}` : '',
      movements,
      evidenceLabel: evidenceLabel(supplier.evidenceType),
      sourceSummary: safeArray(supplier.sourceIds).length > 1
        ? `${supplier.sourceIds.length} cadastros unificados`
        : 'Cadastro único',
    };
  });
};

export const filterSuppliers = (suppliers, query) => {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return suppliers;

  return safeArray(suppliers).filter(supplier => {
    const fields = [
      supplier.name,
      supplier.legalName,
      supplier.cnpj,
      supplier.code,
      supplier.description,
      supplier.category,
      supplier.address,
      supplier.city,
      supplier.state,
      supplier.notes,
      supplier.evidenceSource,
      supplier.evidenceType,
      supplier.sourceSummary,
      ...safeArray(supplier.sourceNames),
      ...safeArray(supplier.paymentMethods),
      ...safeArray(supplier.contacts).flatMap(contact => [
        contact?.name,
        contact?.phone,
        contact?.email,
      ]),
    ];

    return fields.some(field => normalizeSearch(field).includes(normalizedQuery));
  });
};

export const getSupplierSelection = (suppliers, selectedId) =>
  safeArray(suppliers).find(item => String(item.id) === String(selectedId)) ||
  safeArray(suppliers)[0] ||
  null;
