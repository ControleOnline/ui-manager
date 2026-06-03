import {
  cloneSeedData,
  evidenceLabel,
  money,
  normalizeSearch,
  safeArray,
} from '@controleonline/ui-manager/src/react/pages/MenuCostsPage/viewModel';
import Formatter from '@controleonline/ui-common/src/utils/formatter.js';
import {
  buildAddressOptionSummary,
  normalizeText as normalizeEntityText,
} from '@controleonline/ui-common/src/react/utils/entityDisplay';

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
    normalizeText(contact?.phone || ''),
    normalizeText(contact?.email || ''),
  ]
    .filter(Boolean)
    .join('|') || normalizeText(contact?.name || '');

const uniqueById = items => {
  const seen = new Set();
  return safeArray(items).filter(item => {
    const id = item?.id || item?.filePath || item?.title;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const normalizeDateOnly = value => String(value || '').split('T')[0].split(' ')[0].trim();

const resolvePersonDisplayName = person => {
  const alias = normalizeText(person?.alias || '');
  const name = normalizeText(person?.name || '');
  const description = normalizeText(person?.description || '');

  if (alias && name && alias !== name) {
    return alias;
  }

  return alias || name || description || normalizeText(person?.code || person?.id || '');
};

const resolvePersonLegalName = person => {
  const alias = normalizeText(person?.alias || '');
  const name = normalizeText(person?.name || '');

  if (alias && name && alias !== name) {
    return name;
  }

  return '';
};

const resolveDocumentText = documentEntry => {
  const raw = normalizeEntityText(documentEntry?.document || documentEntry?.value || documentEntry);
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 || digits.length === 14) {
    return Formatter.formatBRDocument(digits);
  }

  return raw;
};

const resolvePhoneText = phoneEntry => {
  if (!phoneEntry) return '';

  if (typeof phoneEntry === 'string' || typeof phoneEntry === 'number') {
    return Formatter.formatPhone(phoneEntry);
  }

  const ddi = normalizeText(phoneEntry?.ddi || '');
  const ddd = normalizeText(phoneEntry?.ddd || '');
  const phone = normalizeText(phoneEntry?.phone || '');
  const phoneDigits = `${ddd}${phone}`.replace(/\D/g, '');
  const formattedPhone = phoneDigits ? Formatter.formatBRPhone(phoneDigits) : normalizeText(phone);

  return [ddi ? `+${ddi}` : '', formattedPhone]
    .filter(Boolean)
    .join(' ')
    .trim();
};

const resolveSupplierAddress = person => {
  const address = safeArray(person?.address)[0] || null;
  if (!address) {
    return { address: '', city: '', state: '', cep: '' };
  }

  const summary = buildAddressOptionSummary(address);
  const city = normalizeText(
    address?.street?.district?.city?.city ||
      address?.city?.city ||
      '',
  );
  const state = normalizeText(
    address?.street?.district?.city?.state?.uf ||
      address?.street?.district?.city?.state?.state ||
      address?.state?.uf ||
      '',
  );
  const cep = normalizeText(address?.street?.cep?.cep || address?.postalCode || '');

  return {
    address: [summary.primary, summary.secondary].filter(Boolean).join(' · '),
    city,
    state,
    cep,
  };
};

const resolveSupplierPaymentMethods = person => {
  const raw = person?.otherInformations?.paymentMethods || person?.otherInformations?.paymentMethod || [];
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.map(value => normalizeText(value)).filter(Boolean)));
  }

  const text = normalizeText(raw);
  return text ? [text] : [];
};

const resolveSupplierContactsFromPeople = person => {
  const phones = safeArray(person?.phone).map(resolvePhoneText).filter(Boolean);
  const emails = safeArray(person?.email).map(item => normalizeText(item?.email || item)).filter(Boolean);
  const contactName = resolvePersonDisplayName(person);

  if (!contactName || (!phones.length && !emails.length)) {
    return [];
  }

  return [{
    id: `${person?.id || resolvePersonDisplayName(person)}:contact`,
    name: contactName,
    phone: phones.join(' · '),
    email: emails.join(' · '),
    sourceId: person?.id || '',
    sourceName: resolvePersonDisplayName(person),
  }];
};

const resolvePeopleProductRows = peopleRecords =>
  uniqueById(safeArray(peopleRecords).flatMap(person =>
    safeArray(person?.productPeople).map((relation, index) => {
      const product = relation?.product || {};
      const date = normalizeDateOnly(relation?.createdAt || relation?.updatedAt || '');
      const relationLabel = normalizeText(
        product?.product ||
          product?.name ||
          product?.description ||
          relation?.supplierSku ||
          `Produto vinculado ${index + 1}`,
      );
      const relationType = normalizeText(relation?.role || 'supplier');
      const amount = Number(relation?.costPrice || product?.price || 0);

      return {
        id: `${person?.id || 'supplier'}:product:${relation?.id || product?.id || index}`,
        type: relationType,
        label: relationLabel,
        date,
        amount,
        supplierId: String(person?.id || ''),
        supplierName: resolvePersonDisplayName(person),
        meta: relation?.supplierSku || product?.sku || product?.type || '',
        evidenceType: relationType === 'supplier' ? 'documented' : 'review',
      };
    })
  )).sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));

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

const normalizeSupplierFromPerson = person => {
  const displayName = resolvePersonDisplayName(person);
  const legalName = resolvePersonLegalName(person);
  const address = resolveSupplierAddress(person);
  const contacts = resolveSupplierContactsFromPeople(person);
  const paymentMethods = resolveSupplierPaymentMethods(person);
  const firstPhone = contacts[0]?.phone || '';
  const firstEmail = contacts[0]?.email || '';

  return {
    id: person?.id,
    name: displayName || `Fornecedor #${person?.id || ''}`,
    legalName,
    cnpj: resolveDocumentText(safeArray(person?.document)[0]) || '',
    code: String(person?.id || ''),
    description: normalizeText(person?.description || '') || displayName || legalName || '',
    category: person?.peopleType === 'J' ? 'Pessoa jurídica' : 'Pessoa física',
    address: address.address,
    cep: address.cep,
    city: address.city,
    state: address.state,
    pixKey: '',
    pixKeyType: '',
    notes: normalizeText(person?.otherInformations?.notes || person?.description || ''),
    evidenceType: contacts.length > 0 || safeArray(person?.productPeople).length > 0 ? 'documented' : 'review',
    evidenceSource: 'people',
    paymentMethods,
    sellerName: displayName,
    sellerPhone: firstPhone,
    sellerEmail: firstEmail,
    contacts,
    sourceRecords: [person],
    sourceIds: [person?.id],
    sourceNames: [displayName, legalName].filter(Boolean),
    productPeople: safeArray(person?.productPeople),
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

export const buildImportedSuppliersFromPeople = (peopleRecords = []) => {
  const rawSuppliers = safeArray(peopleRecords)
    .filter(item => item?.id)
    .map(normalizeSupplierFromPerson);
  const groups = new Map();
  const exactKeys = new Map();

  for (const supplier of rawSuppliers) {
    const exactKey = resolveSupplierMergeKey(supplier);
    const normalizedName = normalizeText(
      supplier?.name || supplier?.legalName || supplier?.code || supplier?.id,
    );
    const resolvedKey = exactKey || normalizedName || String(supplier?.id || '').trim();

    if (!resolvedKey) {
      continue;
    }

    if (!groups.has(resolvedKey)) {
      groups.set(resolvedKey, {
        ...supplier,
        sourceRecords: [safeArray(supplier.sourceRecords)[0]].filter(Boolean),
        sourceIds: Array.from(new Set(safeArray(supplier.sourceIds).filter(Boolean))),
        sourceNames: Array.from(new Set(safeArray(supplier.sourceNames).filter(Boolean))),
        paymentMethods: Array.from(new Set(safeArray(supplier.paymentMethods).filter(Boolean))),
        contacts: [...safeArray(supplier.contacts)],
      });
      exactKeys.set(exactKey, resolvedKey);
      continue;
    }

    const currentGroup = groups.get(resolvedKey);
    const nextGroup = mergeSupplierRecords(currentGroup, supplier);
    nextGroup.productPeople = [
      ...safeArray(currentGroup.productPeople),
      ...safeArray(supplier.productPeople),
    ];
    groups.set(resolvedKey, nextGroup);
    exactKeys.set(exactKey, resolvedKey);
  }

  for (const supplier of rawSuppliers) {
    const exactKey = resolveSupplierMergeKey(supplier);
    const normalizedName = normalizeText(
      supplier?.name || supplier?.legalName || supplier?.code || supplier?.id,
    );
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

      const merged = mergeSupplierRecords(target, source);
      merged.productPeople = [
        ...safeArray(target.productPeople),
        ...safeArray(source.productPeople),
      ];
      groups.set(targetKey, merged);
      groups.delete(sourceKey);
      exactKeys.set(exactKey, targetKey);
    }
  }

  const suppliers = [...groups.values()].map(group => {
    const contacts = safeArray(group.contacts)
      .filter(Boolean)
      .filter((contact, index, array) => index === array.findIndex(item => resolveContactKey(item) === resolveContactKey(contact)));
    const productRows = resolvePeopleProductRows(group.sourceRecords || [group]);
    const latest = productRows[0] || null;

    return {
      ...group,
      contacts,
      contactCount: contacts.length,
      duplicateCount: Math.max(0, safeArray(group.sourceIds).length - 1),
      movementCount: productRows.length,
      latestMovement: latest,
      latestMovementDate: latest?.date || '',
      latestMovementLabel: latest ? `${latest.label}${latest.amount ? ` · ${money(latest.amount)}` : ''}` : '',
      movements: productRows,
      evidenceLabel: evidenceLabel(group.evidenceType),
      sourceSummary: safeArray(group.sourceIds).length > 1
        ? `${group.sourceIds.length} cadastros unificados`
        : 'Cadastro único',
    };
  });

  suppliers.sort((left, right) =>
    String(left.name || '').localeCompare(String(right.name || ''), 'pt-BR'),
  );

  return suppliers;
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
