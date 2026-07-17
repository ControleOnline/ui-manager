import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

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

const formatBooleanValue = value => {
  const normalized = normalizeBooleanValue(value);

  return {
    value: normalized,
    label: normalized ? 'Sim' : 'Não',
  };
};

const saveBooleanValue = value => normalizeBooleanValue(value?.value ?? value);

const formatCommandValue = value => {
  if (typeof value === 'string') {
    return {
      value: value.trim(),
      label: value.trim(),
    };
  }

  const commandName = String(value?.name ?? value?.value ?? value?.command ?? '').trim();

  return {
    value: commandName,
    label: String(value?.label ?? commandName).trim() || commandName,
  };
};

const saveCommandValue = value => String(value?.value ?? value?.name ?? value ?? '').trim();

const formatArgumentsValue = value =>
  Array.isArray(value)
    ? value.map(argument => String(argument).trim()).filter(Boolean).join(' | ')
    : String(value ?? '').trim();

const saveArgumentsValue = value => {
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

export default {
  namespaced: true,
  state: {
    item: {},
    items: [],
    resourceEndpoint: 'cron_jobs',
    isLoading: false,
    isSaving: false,
    error: '',
    totalItems: 0,
    summary: {},
    filters: {},
    add: true,
    columns: [
      {
        editable: false,
        isIdentity: true,
        sortable: true,
        name: 'id',
        align: 'left',
        label: 'ID',
        format: value => `#${value}`,
      },
      {
        editable: true,
        sortable: true,
        defaultSort: {
          direction: 'asc',
        },
        defaultValue: 10,
        name: 'sortOrder',
        align: 'left',
        label: 'Ordem',
        inputType: 'number',
        format: value => Number(value ?? 0),
      },
      {
        editable: true,
        sortable: true,
        name: 'jobKey',
        align: 'left',
        label: 'Chave',
      },
      {
        editable: true,
        sortable: true,
        name: 'title',
        align: 'left',
        label: 'Título',
      },
      {
        editable: true,
        sortable: true,
        name: 'command',
        align: 'left',
        label: 'Command',
        list: 'cron_job_commands/getItems',
        searchParam: 'name',
        formatList: formatCommandValue,
        saveFormat: saveCommandValue,
        format: value => String(value ?? '').trim(),
      },
      {
        editable: true,
        sortable: true,
        name: 'cronExpression',
        align: 'left',
        label: 'Cron',
        defaultValue: '* * * * *',
        format: value => String(value ?? '').trim(),
      },
      {
        editable: true,
        sortable: true,
        name: 'enabled',
        align: 'left',
        label: 'Ativo',
        defaultValue: true,
        list: [
          { value: true, label: 'Sim' },
          { value: false, label: 'Não' },
        ],
        formatList: formatBooleanValue,
        saveFormat: saveBooleanValue,
        format: value => (normalizeBooleanValue(value) ? 'Sim' : 'Não'),
      },
      {
        editable: true,
        sortable: true,
        name: 'background',
        align: 'left',
        label: 'Background',
        defaultValue: true,
        list: [
          { value: true, label: 'Sim' },
          { value: false, label: 'Não' },
        ],
        formatList: formatBooleanValue,
        saveFormat: saveBooleanValue,
        format: value => (normalizeBooleanValue(value) ? 'Sim' : 'Não'),
      },
      {
        editable: true,
        sortable: false,
        table: false,
        name: 'arguments',
        align: 'left',
        label: 'Argumentos',
        editFormat: formatArgumentsValue,
        format: formatArgumentsValue,
        saveFormat: saveArgumentsValue,
      },
      {
        editable: true,
        sortable: false,
        table: false,
        name: 'description',
        align: 'left',
        label: 'Descrição',
        format: value => String(value ?? '').trim(),
      },
      {
        editable: false,
        sortable: false,
        name: 'isValid',
        align: 'left',
        label: 'Válido',
        format: value => (value ? 'Sim' : 'Não'),
      },
    ],
  },
  actions,
  getters,
  mutations,
};
