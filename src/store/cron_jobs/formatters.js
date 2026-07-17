const normalizeBooleanValue = value => {
  if (value === true || value === 1) {
    return true;
  }

  const normalized = String(value ?? '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'sim', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'nao', 'não', 'off'].includes(normalized)) {
    return false;
  }

  return Boolean(value);
};

export const formatBooleanValue = value => {
  const normalized = normalizeBooleanValue(value);

  return {
    value: normalized,
    label: normalized ? 'Sim' : 'Não',
  };
};

export const formatEnabledValue = value => (normalizeBooleanValue(value) ? 'Sim' : 'Não');

export const saveBooleanValue = value => normalizeBooleanValue(value?.value ?? value);

export const formatCommandValue = value => {
  if (typeof value === 'string') {
    const commandName = value.trim();

    return {
      value: commandName,
      label: commandName,
    };
  }

  const commandName = String(value?.name ?? value?.value ?? value?.command ?? '').trim();

  return {
    value: commandName,
    label: String(value?.label ?? commandName).trim() || commandName,
  };
};

export const saveCommandValue = value => String(value?.value ?? value?.name ?? value ?? '').trim();

export const formatArgumentsValue = value =>
  Array.isArray(value)
    ? value.map(argument => String(argument).trim()).filter(Boolean).join(' | ')
    : String(value ?? '').trim();

export const saveArgumentsValue = value => {
  if (Array.isArray(value)) {
    return value
      .map(argument => String(argument).trim())
      .filter(Boolean);
  }

  const rawValue = String(value ?? '').trim();
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(/[\r\n,|]+/)
    .map(argument => argument.trim())
    .filter(Boolean);
};
