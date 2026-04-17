import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import RenderHTML from 'react-native-render-html';
import Icon from 'react-native-vector-icons/Feather';
import { useStore } from '@store';
import { api } from '@controleonline/ui-common/src/api';
import useToastMessage from '@controleonline/ui-crm/src/react/hooks/useToastMessage';

import {
  getCategoryContextForDocument,
} from '@controleonline/ui-manager/src/react/utils/categoryContexts';

import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import styles from './ModelTemplatesPage.styles';
import { inlineStyle_1012_59, inlineStyle_1068_14 } from './ModelTemplatesPage.styles';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  android: { elevation: 3 },
  web: { boxShadow: '0 6px 18px rgba(15,23,42,0.08)' },
});

const CONTEXT_OPTIONS = [
  { value: 'proposal', label: 'Propostas', newLabel: 'Nova proposta', icon: 'briefcase', color: '#8B5CF6' },
  { value: 'contract', label: 'Contratos', newLabel: 'Novo contrato', icon: 'file-text', color: '#0EA5E9' },
  { value: 'email', label: 'E-mails', newLabel: 'Novo e-mail', icon: 'mail', color: '#22C55E' },
  { value: 'menu', label: 'Cardapios', newLabel: 'Novo cardapio', icon: 'book-open', color: '#F59E0B' },
];

const FILTER_OPTIONS = [{ value: 'all', label: 'Todos os tipos' }, ...CONTEXT_OPTIONS];

const CONTEXT_HELP = {
  proposal:
    'Use para propostas comerciais. O backend costuma renderizar este tipo com as variaveis `contract` e `service`.',
  contract:
    'Use para contratos. O arquivo Twig/HTML e salvo em `files.content` e vinculado ao registro de `models`.',
  email:
    'Use para e-mails HTML. As variaveis finais dependem do fluxo que renderiza este template.',
  menu:
    'Use para cardapios. O backend disponibiliza `company`, `companyName`, `columns`, `generatedAt`, `catalog` e `service`.',
};

const COMMON_SNIPPETS = [
  { label: 'Variavel', value: '{{ variavel }}' },
  { label: 'Condicional', value: '{% if condicao %}\n  <p>Conteudo</p>\n{% endif %}' },
  { label: 'Loop', value: '{% for item in itens %}\n  <p>{{ item }}</p>\n{% endfor %}' },
  { label: 'Quebra de pagina', value: '<div style="page-break-after: always;"></div>' },
];

const CONTEXT_SNIPPETS = {
  proposal: [
    { label: 'Titulo', value: '<h1>{{ contract.contractModel.model|default(\'Proposta comercial\') }}</h1>' },
    { label: 'Cliente', value: '{{ contract.client.alias|default(contract.client.name|default(\'\')) }}' },
    { label: 'Fornecedor', value: '{{ contract.provider.alias|default(contract.provider.name|default(\'\')) }}' },
  ],
  contract: [
    { label: 'Titulo', value: '<h1>{{ contract.contractModel.model|default(\'Contrato\') }}</h1>' },
    { label: 'Inicio', value: '{{ contract.startDate|date(\'d/m/Y\') }}' },
    { label: 'Assinatura', value: '<div class="signature-line">Assinatura</div>' },
  ],
  email: [
    { label: 'Assunto', value: '{{ subject|default(\'Mensagem importante\') }}' },
    { label: 'Destinatario', value: '{{ recipientName|default(\'Cliente\') }}' },
    { label: 'Botao CTA', value: '{% if ctaUrl %}<a href="{{ ctaUrl }}">{{ ctaLabel|default(\'Abrir link\') }}</a>{% endif %}' },
  ],
  menu: [
    { label: 'Empresa', value: '{{ companyName|default(menuModelName|default(\'Cardapio\')) }}' },
    { label: 'Loop categorias', value: '{% for column in columns %}\n  {% for category in column %}\n    <h2>{{ category.name }}</h2>\n  {% endfor %}\n{% endfor %}' },
    { label: 'Loop produtos', value: '{% for product in category.products %}\n  <p>{{ product.name }} - {{ product.priceLabel }}</p>\n{% endfor %}' },
  ],
};

const DEFAULT_CATEGORY_NAMES = {
  proposal: 'Propostas',
  contract: 'Contratos',
  email: 'E-mails',
  menu: 'Cardapios',
};

const formatApiError = error => {
  if (!error) return 'Nao foi possivel concluir a operacao.';
  if (typeof error === 'string') return error;
  if (Array.isArray(error?.message)) {
    return error.message
      .map(item => item?.message || item?.toString?.() || '')
      .filter(Boolean)
      .join(', ');
  }

  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel concluir a operacao.';
};

const normalizeId = value => String(value || '').replace(/\D/g, '');

const toIri = (value, resource) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const normalized = String(value).trim();
    if (!normalized) return null;
    if (normalized.startsWith('/')) return normalized;
    const id = normalizeId(normalized);
    return id ? `/${resource}/${id}` : null;
  }

  if (value?.['@id']) return value['@id'];
  if (value?.id) return `/${resource}/${value.id}`;
  return null;
};

const getContextMeta = context =>
  CONTEXT_OPTIONS.find(option => option.value === context) || CONTEXT_OPTIONS[0];

const slugify = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const buildFileName = (modelName, context) => {
  const base = slugify(modelName) || `modelo-${context}`;
  return `${base}.html`;
};

const decodeBase64Text = value => {
  if (!value) return '';

  try {
    if (typeof globalThis?.Buffer !== 'undefined') {
      return globalThis.Buffer.from(String(value), 'base64').toString('utf-8');
    }
  } catch (_) {
    // fallback below
  }

  try {
    if (typeof globalThis?.atob === 'function') {
      const binary = globalThis.atob(String(value));
      if (typeof globalThis?.TextDecoder !== 'undefined') {
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        return new globalThis.TextDecoder('utf-8').decode(bytes);
      }

      return binary;
    }
  } catch (_) {
    // final fallback below
  }

  return String(value);
};

const getStoredSession = () => {
  try {
    if (typeof localStorage === 'undefined') {
      return {};
    }
    return JSON.parse(localStorage.getItem('session') || '{}');
  } catch (_) {
    return {};
  }
};

const toPeopleIri = value => {
  if (!value) return null;

  if (typeof value === 'string' || typeof value === 'number') {
    return toIri(value, 'people');
  }

  return (
    toIri(value?.people, 'people') ||
    toIri(value?.person, 'people') ||
    toIri(value?.peopleId, 'people') ||
    toIri(value?.people_id, 'people') ||
    toIri(value?.personId, 'people') ||
    toIri(value?.person_id, 'people') ||
    (typeof value?.['@id'] === 'string' && value['@id'].includes('/people/') ? value['@id'] : null) ||
    (value?.peopleType ? toIri(value?.id, 'people') : null)
  );
};

const resolveDefaultSignerIri = (signers, preferredSignerIri) => {
  const safeSigners = Array.isArray(signers) ? signers : [];
  if (safeSigners.length === 0) return null;

  if (preferredSignerIri) {
    const preferredMatch = safeSigners.find(person => toIri(person, 'people') === preferredSignerIri);
    if (preferredMatch) {
      return toIri(preferredMatch, 'people');
    }
  }

  return toIri(safeSigners[0], 'people');
};

const FieldLabel = ({ label, required = false, suffix = '' }) => (
  <Text style={styles.fieldLabel}>
    {label}
    {suffix ? ` ${suffix}` : ''}
    {required ? <Text style={styles.fieldRequiredMark}> *</Text> : null}
  </Text>
);

const buildStarterTemplate = context => {
  if (context === 'contract') {
    return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; padding: 40px; }
      h1, h2 { margin-bottom: 8px; }
      .muted { color: #64748b; }
      .signature-line { margin-top: 48px; padding-top: 24px; border-top: 1px solid #94a3b8; width: 260px; }
    </style>
  </head>
  <body>
    <h1>{{ contract.contractModel.model|default('Contrato') }}</h1>
    <p class="muted">Documento #{{ contract.id|default('') }}</p>

    <p>
      Contratante:
      <strong>{{ contract.provider.alias|default(contract.provider.name|default('')) }}</strong>
    </p>
    <p>
      Cliente:
      <strong>{{ contract.client.alias|default(contract.client.name|default('')) }}</strong>
    </p>
    <p>Inicio: {{ contract.startDate|date('d/m/Y') }}</p>

    <h2>Objeto</h2>
    <p>Descreva aqui as clausulas e regras deste contrato.</p>

    <div class="signature-line">Assinatura</div>
  </body>
</html>`;
  }

  if (context === 'email') {
    return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
  </head>
  <body style="margin:0; padding:24px; background:#f8fafc; font-family:Arial, sans-serif; color:#0f172a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:20px; padding:32px;">
      <tr>
        <td>
          <p style="margin:0 0 8px; color:#64748b;">{{ recipientName|default('Cliente') }}</p>
          <h1 style="margin:0 0 16px; font-size:28px;">{{ subject|default('Mensagem importante') }}</h1>
          <p style="margin:0 0 24px; line-height:1.7;">{{ message|default('Escreva aqui o corpo do e-mail.') }}</p>

          {% if ctaUrl %}
            <p style="margin:0 0 24px;">
              <a href="{{ ctaUrl }}" style="display:inline-block; padding:14px 22px; border-radius:999px; background:#0f172a; color:#ffffff; text-decoration:none;">
                {{ ctaLabel|default('Abrir link') }}
              </a>
            </p>
          {% endif %}

          <p style="margin:32px 0 0; color:#64748b;">{{ signature|default('Equipe Controle Online') }}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  if (context === 'menu') {
    return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 32px; }
      header { margin-bottom: 28px; }
      .muted { color: #64748b; }
      .category { margin-bottom: 28px; }
      .item { display: flex; justify-content: space-between; gap: 24px; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
      .item h3 { margin: 0 0 6px; font-size: 18px; }
      .item p { margin: 0; color: #475569; }
    </style>
  </head>
  <body>
    <header>
      <h1>{{ companyName|default(menuModelName|default('Cardapio')) }}</h1>
      <p class="muted">Gerado em {{ generatedAt|date('d/m/Y H:i') }}</p>
    </header>

    {% for column in columns %}
      {% for category in column %}
        <section class="category">
          <h2>{{ category.name }}</h2>

          {% for product in category.products %}
            <article class="item">
              <div>
                <h3>{{ product.name }}</h3>
                {% if product.description %}
                  <p>{{ product.description }}</p>
                {% endif %}
              </div>
              <strong>{{ product.priceLabel }}</strong>
            </article>
          {% endfor %}
        </section>
      {% endfor %}
    {% endfor %}
  </body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; padding: 40px; }
      h1, h2 { margin-bottom: 8px; }
      .muted { color: #64748b; }
    </style>
  </head>
  <body>
    <h1>{{ contract.contractModel.model|default('Proposta comercial') }}</h1>
    <p class="muted">Documento #{{ contract.id|default('') }}</p>

    <p>
      Cliente:
      <strong>{{ contract.client.alias|default(contract.client.name|default('')) }}</strong>
    </p>
    <p>
      Responsavel:
      <strong>{{ contract.provider.alias|default(contract.provider.name|default('')) }}</strong>
    </p>

    <h2>Escopo</h2>
    <p>Descreva aqui os entregaveis, prazos, valores e observacoes da proposta.</p>
  </body>
</html>`;
};

const buildDraftState = (context, peopleIri, overrides = {}) => {
  const safeContext = CONTEXT_OPTIONS.some(option => option.value === context)
    ? context
    : 'proposal';
  const defaultName = {
    proposal: 'Nova proposta',
    contract: 'Novo contrato',
    email: 'Novo email',
    menu: 'Novo cardapio',
  }[safeContext];

  const html = overrides.html ?? buildStarterTemplate(safeContext);
  const modelName = overrides.model ?? defaultName;

  return {
    id: overrides.id || null,
    model: modelName,
    context: safeContext,
    fileId: overrides.fileId || null,
    html,
    category: overrides.category || null,
    signer: overrides.signer || null,
    people: overrides.people || peopleIri || null,
    fileName: overrides.fileName || buildFileName(modelName, safeContext),
    fileContext: overrides.fileContext || safeContext,
    fileType: overrides.fileType || 'text',
    extension: overrides.extension || 'html',
  };
};

const countByContext = items =>
  CONTEXT_OPTIONS.reduce(
    (acc, option) => ({
      ...acc,
      [option.value]: items.filter(item => item?.context === option.value).length,
    }),
    {},
  );

export default function ModelTemplatesPage({ route, navigation }) {
  const authStore = useStore('auth');
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const modelsStore = useStore('models');
  const fileStore = useStore('file');
  const { user: authUser } = authStore.getters;
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const modelsActions = modelsStore.actions;
  const fileActions = fileStore.actions;
  const { items: modelItems = [] } = modelsStore.getters;
  const { showError, showSuccess } = useToastMessage();
  const editorRef = useRef(null);
  const metadataRequestRef = useRef(0);
  const { width } = useWindowDimensions();

  const brandColors = useMemo(
    () =>
      resolveThemePalette(
        {
          ...themeColors,
          ...(currentCompany?.theme?.colors || {}),
        },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );

  const isDesktop = width >= 1100;
  const peopleIri = useMemo(
    () => (currentCompany?.id ? `/people/${normalizeId(currentCompany.id)}` : ''),
    [currentCompany?.id],
  );
  const preferredSignerIri = useMemo(() => {
    const session = getStoredSession();
    return toPeopleIri(authUser) || toPeopleIri(session) || null;
  }, [authUser]);

  const initialContext = useMemo(() => {
    const requested = route?.params?.presetContext || route?.params?.filterContext;
    return CONTEXT_OPTIONS.some(option => option.value === requested)
      ? requested
      : 'proposal';
  }, [route?.params?.filterContext, route?.params?.presetContext]);

  const [loading, setLoading] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [search, setSearch] = useState('');
  const [filterContext, setFilterContext] = useState(
    route?.params?.filterContext && FILTER_OPTIONS.some(option => option.value === route.params.filterContext)
      ? route.params.filterContext
      : 'all',
  );
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(buildDraftState(initialContext, peopleIri));
  const [isDirty, setIsDirty] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState('editor');
  const [editorSelection, setEditorSelection] = useState({ start: 0, end: 0 });
  const [signers, setSigners] = useState([]);
  const [categories, setCategories] = useState([]);

  const filteredModels = useMemo(() => {
    const term = String(search || '').trim().toLowerCase();
    if (!term) return modelItems;

    return modelItems.filter(item => {
      const label = String(item?.model || '').toLowerCase();
      const contextLabel = String(getContextMeta(item?.context)?.label || '').toLowerCase();
      return label.includes(term) || contextLabel.includes(term);
    });
  }, [modelItems, search]);

  const counters = useMemo(() => countByContext(modelItems), [modelItems]);
  const activeContextMeta = useMemo(() => getContextMeta(draft.context), [draft.context]);
  const activeSnippets = useMemo(
    () => [...COMMON_SNIPPETS, ...(CONTEXT_SNIPPETS[draft.context] || [])],
    [draft.context],
  );

  const focusEditor = useCallback(() => {
    const focus = () => editorRef.current?.focus?.();

    if (typeof globalThis?.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(focus);
      return;
    }

    globalThis?.setTimeout?.(focus, 0);
  }, []);

  const confirmDiscardChanges = useCallback(async () => {
    if (!isDirty) return true;

    const message = 'Existem alteracoes nao salvas. Deseja descartar e continuar?';
    const confirmFn = globalThis?.window?.confirm || globalThis?.confirm;

    if (Platform.OS === 'web' && typeof confirmFn === 'function') {
      return confirmFn(message);
    }

    return new Promise(resolve => {
      Alert.alert(
        'Descartar alteracoes?',
        message,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Descartar', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true },
      );
    });
  }, [isDirty]);

  const loadModels = useCallback(async () => {
    if (!peopleIri) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = {
        people: peopleIri,
        itemsPerPage: 200,
      };

      if (filterContext !== 'all') params.context = filterContext;
      await modelsActions.getItems(params);
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setLoading(false);
    }
  }, [filterContext, modelsActions, peopleIri, showError]);

  const loadMetadata = useCallback(async context => {
    if (!peopleIri) {
      setSigners([]);
      setCategories([]);
      return { signers: [], categories: [] };
    }

    const requestId = metadataRequestRef.current + 1;
    metadataRequestRef.current = requestId;
    setSigners([]);
    setCategories([]);
    setLoadingMetadata(true);
    try {
      const categoryContext = getCategoryContextForDocument(context);
      const [signersResponse, categoriesResponse] = await Promise.all([
        api.fetch('/people', {
          params: {
            'link.company': peopleIri,
            'link.linkType': 'employee',
            peopleType: 'F',
            itemsPerPage: 200,
          },
        }).catch(() => null),
        api.fetch('/categories', {
          params: {
            company: peopleIri,
            context: categoryContext,
            itemsPerPage: 200,
          },
        }).catch(() => null),
      ]);

      const nextSigners = Array.isArray(signersResponse?.member) ? signersResponse.member : [];
      const nextCategories = Array.isArray(categoriesResponse?.member)
        ? categoriesResponse.member
        : [];

      if (metadataRequestRef.current === requestId) {
        setSigners(nextSigners);
        setCategories(nextCategories);
      }
      return { signers: nextSigners, categories: nextCategories };
    } finally {
      if (metadataRequestRef.current === requestId) {
        setLoadingMetadata(false);
      }
    }
  }, [peopleIri]);

  const ensureContextCategory = useCallback(
    async (context, preferredCategoryIri, availableCategories = []) => {
      if (preferredCategoryIri) return preferredCategoryIri;

      const safeCategories = Array.isArray(availableCategories) ? availableCategories : [];
      const firstCategoryIri = toIri(safeCategories[0], 'categories');
      if (firstCategoryIri) return firstCategoryIri;

      if (!peopleIri) return null;

      const contextMeta = getContextMeta(context);
      const categoryContext = getCategoryContextForDocument(context);
      const createdCategory = await api.post('/categories', {
        name: DEFAULT_CATEGORY_NAMES[context] || `Modelos de ${contextMeta.label.toLowerCase()}`,
        context: categoryContext,
        company: peopleIri,
        color: contextMeta.color,
        icon: contextMeta.icon,
      });

      if (createdCategory) {
        setCategories(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const createdId = normalizeId(createdCategory?.id || createdCategory?.['@id']);
          if (!createdId) return [createdCategory, ...safePrev];
          if (safePrev.some(item => normalizeId(item?.id || item?.['@id']) === createdId)) {
            return safePrev;
          }
          return [createdCategory, ...safePrev];
        });
      }

      return toIri(createdCategory, 'categories');
    },
    [peopleIri],
  );

  const hydrateDraftFromModel = useCallback(
    async (modelRecord, options = {}) => {
      if (!modelRecord) return;

      const skipConfirm = Boolean(options.skipConfirm);
      const modelId = normalizeId(modelRecord?.id || modelRecord?.['@id']);

      if (selectedId === modelId && !isCreating && !skipConfirm) return;

      if (!skipConfirm) {
        const canProceed = await confirmDiscardChanges();
        if (!canProceed) return;
      }

      setLoadingFile(true);
      try {
        const fileId = normalizeId(modelRecord?.file?.id || modelRecord?.file?.['@id'] || modelRecord?.file);
        let fileData = null;
        let html = '';

        if (fileId) {
          fileData = await api.fetch(`/files/${fileId}`);
          html = decodeBase64Text(fileData?.content);
        }

        const nextDraft = buildDraftState(modelRecord?.context, peopleIri, {
          id: modelId,
          model: String(modelRecord?.model || ''),
          fileId,
          html,
          category: toIri(modelRecord?.category, 'categories'),
          signer: toIri(modelRecord?.signer, 'people'),
          people: toIri(modelRecord?.people, 'people') || peopleIri,
          fileName: fileData?.fileName || modelRecord?.file?.fileName || buildFileName(modelRecord?.model, modelRecord?.context),
          fileContext: fileData?.context || modelRecord?.context,
          fileType: fileData?.fileType || 'text',
          extension: fileData?.extension || 'html',
        });

        setSelectedId(modelId);
        setDraft(nextDraft);
        setIsDirty(false);
        setIsCreating(false);
        setViewMode('editor');
        setEditorSelection({ start: nextDraft.html.length, end: nextDraft.html.length });
      } catch (error) {
        showError(formatApiError(error));
      } finally {
        setLoadingFile(false);
      }
    },
    [confirmDiscardChanges, isCreating, peopleIri, selectedId, showError],
  );

  const startNewDraft = useCallback(
    async (context, options = {}) => {
      const skipConfirm = Boolean(options.skipConfirm);

      if (!skipConfirm) {
        const canProceed = await confirmDiscardChanges();
        if (!canProceed) return;
      }

      const nextDraft = buildDraftState(context, peopleIri);
      setDraft(nextDraft);
      setSelectedId(null);
      setIsDirty(Boolean(options.markDirty ?? true));
      setIsCreating(true);
      setViewMode('editor');
      setEditorSelection({ start: nextDraft.html.length, end: nextDraft.html.length });
      focusEditor();
    },
    [confirmDiscardChanges, focusEditor, peopleIri],
  );

  const updateDraft = useCallback(updater => {
    setDraft(prev => {
      const next =
        typeof updater === 'function'
          ? updater(prev)
          : {
              ...prev,
              ...updater,
            };

      return {
        ...next,
        fileName: buildFileName(next.model, next.context),
      };
    });
    setIsDirty(true);
  }, []);

  const insertSnippet = useCallback(
    snippet => {
      updateDraft(prev => {
        const start = editorSelection?.start ?? prev.html.length;
        const end = editorSelection?.end ?? start;
        const nextHtml = `${prev.html.slice(0, start)}${snippet}${prev.html.slice(end)}`;
        const nextCursor = start + snippet.length;
        setEditorSelection({ start: nextCursor, end: nextCursor });

        return {
          ...prev,
          html: nextHtml,
        };
      });

      focusEditor();
    },
    [editorSelection?.end, editorSelection?.start, focusEditor, updateDraft],
  );

  const handleSave = useCallback(async () => {
    const name = String(draft.model || '').trim();
    const context = String(draft.context || '').trim();
    const html = String(draft.html || '');

    if (!peopleIri) {
      showError('Selecione uma empresa para editar os modelos.');
      return;
    }

    if (!name) {
      showError('Informe o nome do modelo.');
      return;
    }

    if (!CONTEXT_OPTIONS.some(option => option.value === context)) {
      showError('Selecione um tipo de modelo valido.');
      return;
    }

    if (!html.trim()) {
      showError('Informe o HTML/Twig do modelo.');
      return;
    }

    const metadata =
      loadingMetadata || categories.length === 0 || signers.length === 0
        ? await loadMetadata(context)
        : { categories, signers };

    const availableCategories = Array.isArray(metadata?.categories) ? metadata.categories : categories;
    const availableSigners = Array.isArray(metadata?.signers) ? metadata.signers : signers;
    const signerIri = draft.signer || resolveDefaultSignerIri(availableSigners, preferredSignerIri);
    const categoryIri = await ensureContextCategory(context, draft.category, availableCategories);

    if (!categoryIri) {
      showError('Nao foi possivel definir a categoria do modelo. Verifique as categorias deste contexto.');
      return;
    }

    if (!signerIri) {
      showError('Cadastre ao menos um responsavel da empresa para assinar este modelo antes de salvar.');
      return;
    }

    setSaving(true);
    try {
      const savedFile = await fileActions.save({
        id: draft.fileId || undefined,
        people: peopleIri,
        context,
        fileType: 'text',
        fileName: buildFileName(name, context),
        extension: 'html',
        content: html,
      });

      const fileIri = toIri(savedFile, 'files');
      const savedModel = await modelsActions.save({
        id: draft.id || undefined,
        model: name,
        context,
        people: peopleIri,
        signer: signerIri,
        category: categoryIri,
        file: fileIri,
      });

      const nextDraft = buildDraftState(context, peopleIri, {
        id: normalizeId(savedModel?.id || savedModel?.['@id']),
        model: name,
        fileId: normalizeId(savedFile?.id || savedFile?.['@id']),
        html,
        category: categoryIri,
        signer: signerIri,
        people: peopleIri,
        fileName: savedFile?.fileName || buildFileName(name, context),
        fileContext: savedFile?.context || context,
        fileType: savedFile?.fileType || 'text',
        extension: savedFile?.extension || 'html',
      });

      setDraft(nextDraft);
      setSelectedId(nextDraft.id);
      setIsDirty(false);
      setIsCreating(false);
      showSuccess(draft.id ? 'Modelo atualizado com sucesso.' : 'Modelo criado com sucesso.');

      if (filterContext !== 'all' && filterContext !== context) {
        setFilterContext(context);
      } else {
        await loadModels();
      }
    } catch (error) {
      showError(formatApiError(error));
    } finally {
      setSaving(false);
    }
  }, [
    categories,
    draft,
    ensureContextCategory,
    fileActions,
    filterContext,
    loadMetadata,
    loadModels,
    loadingMetadata,
    modelsActions,
    peopleIri,
    preferredSignerIri,
    showError,
    showSuccess,
    signers,
  ]);

  const handleFilterChange = useCallback(
    async nextContext => {
      if (nextContext === filterContext) return;

      const canProceed = await confirmDiscardChanges();
      if (!canProceed) return;

      setSelectedId(null);
      setIsCreating(false);
      setFilterContext(nextContext);
    },
    [confirmDiscardChanges, filterContext],
  );

  useFocusEffect(
    useCallback(() => {
      loadModels();
      loadMetadata(draft.context);
    }, [draft.context, loadMetadata, loadModels]),
  );

  useEffect(() => {
    if (loading) return;
    if (!peopleIri) return;

    const visibleIds = new Set(modelItems.map(item => normalizeId(item?.id || item?.['@id'])));

    if (selectedId && !visibleIds.has(selectedId) && !isCreating) {
      setSelectedId(null);
    }

    if (isCreating) return;

    if (!selectedId) {
      if (modelItems.length > 0) {
        hydrateDraftFromModel(modelItems[0], { skipConfirm: true });
      } else {
        const nextContext = filterContext !== 'all' ? filterContext : initialContext;
        const nextDraft = buildDraftState(nextContext, peopleIri);
        setDraft(nextDraft);
        setIsDirty(false);
        setIsCreating(true);
        setViewMode('editor');
      }
    }
  }, [
    filterContext,
    hydrateDraftFromModel,
    initialContext,
    isCreating,
    loading,
    modelItems,
    peopleIri,
    selectedId,
  ]);

  useEffect(() => {
    const actionKey = route?.params?.templateAction;
    if (!actionKey) return;

    const requestedFilter = route?.params?.filterContext;
    if (requestedFilter && FILTER_OPTIONS.some(option => option.value === requestedFilter)) {
      setFilterContext(requestedFilter);
    }

    if (route?.params?.startNew) {
      startNewDraft(route?.params?.presetContext || initialContext, {
        skipConfirm: true,
        markDirty: true,
      });
    }
  }, [
    initialContext,
    route?.params?.filterContext,
    route?.params?.presetContext,
    route?.params?.startNew,
    route?.params?.templateAction,
    startNewDraft,
  ]);

  useEffect(() => {
    loadMetadata(draft.context);
  }, [draft.context, loadMetadata]);

  useEffect(() => {
    const defaultCategoryIri = draft.category || toIri(categories[0], 'categories') || null;
    const defaultSignerIri = draft.signer || resolveDefaultSignerIri(signers, preferredSignerIri);

    if (defaultCategoryIri === draft.category && defaultSignerIri === draft.signer) {
      return;
    }

    setDraft(prev => ({
      ...prev,
      category: prev.category || defaultCategoryIri,
      signer: prev.signer || defaultSignerIri,
    }));
  }, [categories, draft.category, draft.signer, preferredSignerIri, signers]);

  const renderSummary = () => (
    <View style={styles.summaryRow}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Modelos visiveis</Text>
        <Text style={styles.summaryValue}>{modelItems.length}</Text>
      </View>
      {CONTEXT_OPTIONS.map(option => (
        <View key={option.value} style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{option.label}</Text>
          <Text style={[styles.summaryValue, { color: option.color }]}>
            {counters[option.value] || 0}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderSidebar = () => (
    <View>
      <Text style={styles.panelTitle}>Biblioteca de modelos</Text>
      <Text style={styles.panelSub}>
        Edite HTML/Twig para proposal, contract, email e menu.
      </Text>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar modelo"
        placeholderTextColor="#94A3B8"
        style={styles.searchInput}
      />

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Filtro por tipo</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={filterContext}
            onValueChange={handleFilterChange}
            mode={Platform.OS === 'android' ? 'dropdown' : undefined}
          >
            {FILTER_OPTIONS.map(option => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.quickActionsGrid}>
        {CONTEXT_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            style={styles.quickActionCard}
            activeOpacity={0.88}
            onPress={() => startNewDraft(option.value)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: withOpacity(option.color, 0.12) }]}>
              <Icon name={option.icon} size={18} color={option.color} />
            </View>
            <Text style={styles.quickActionLabel}>{option.newLabel}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Modelos</Text>
        {loading && <ActivityIndicator size="small" color={brandColors.primary} />}
      </View>

      {filteredModels.length === 0 && !loading ? (
        <View style={styles.emptyBox}>
          <Icon name="file-text" size={28} color="#CBD5E1" style={inlineStyle_1012_59} />
          <Text style={styles.emptyTitle}>Nenhum modelo encontrado</Text>
          <Text style={styles.emptySub}>
            Crie um novo modelo a partir de um dos tipos disponiveis.
          </Text>
        </View>
      ) : (
        filteredModels.map(item => {
          const itemId = normalizeId(item?.id || item?.['@id']);
          const isActive = selectedId === itemId && !isCreating;
          const meta = getContextMeta(item?.context);

          return (
            <TouchableOpacity
              key={itemId || item?.model}
              style={[
                styles.modelCard,
                isActive && {
                  borderColor: meta.color,
                  backgroundColor: withOpacity(meta.color, 0.06),
                },
              ]}
              activeOpacity={0.88}
              onPress={() => hydrateDraftFromModel(item)}
            >
              <View style={styles.modelCardHeader}>
                <Text style={styles.modelCardTitle} numberOfLines={2}>
                  {item?.model || 'Modelo sem nome'}
                </Text>
                <View
                  style={[
                    styles.contextBadge,
                    {
                      backgroundColor: withOpacity(meta.color, 0.12),
                      borderColor: withOpacity(meta.color, 0.28),
                    },
                  ]}
                >
                  <Text style={[styles.contextBadgeText, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.modelMeta}>
                Arquivo #{normalizeId(item?.file?.id || item?.file?.['@id'] || item?.file) || 'novo'}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  const renderEditor = () => (
    <View>
      <View style={styles.editorHeader}>
        <View style={inlineStyle_1068_14}>
          <Text style={styles.panelTitle}>
            {draft.id ? 'Editar modelo' : 'Novo modelo'}
          </Text>
          <Text style={styles.panelSub}>
            {CONTEXT_HELP[draft.context]}
          </Text>
          <Text style={styles.requiredHint}>* Campos obrigatorios</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: brandColors.primary, opacity: saving ? 0.7 : 1 },
          ]}
          disabled={saving}
          activeOpacity={0.88}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="save" size={16} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: withOpacity(activeContextMeta.color, 0.1),
              borderColor: withOpacity(activeContextMeta.color, 0.22),
            },
          ]}
        >
          <Icon name={activeContextMeta.icon} size={14} color={activeContextMeta.color} />
          <Text style={[styles.statusBadgeText, { color: activeContextMeta.color }]}>
            {activeContextMeta.label}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Icon name="file" size={14} color="#64748B" />
          <Text style={styles.statusBadgeText}>{draft.fileName}</Text>
        </View>

        {isDirty && (
          <View style={[styles.statusBadge, { borderColor: '#F59E0B', backgroundColor: withOpacity('#F59E0B', 0.08) }]}>
            <Icon name="alert-circle" size={14} color="#F59E0B" />
            <Text style={[styles.statusBadgeText, { color: '#B45309' }]}>Alteracoes pendentes</Text>
          </View>
        )}
      </View>

      <View style={styles.formGrid}>
        <View style={[styles.fieldBlock, styles.formField]}>
          <FieldLabel label="Nome do modelo" required />
          <TextInput
            value={draft.model}
            onChangeText={value => updateDraft({ model: value })}
            placeholder="Ex.: Contrato padrao"
            placeholderTextColor="#94A3B8"
            style={styles.textInput}
          />
        </View>

        <View style={[styles.fieldBlock, styles.formField]}>
          <FieldLabel label="Tipo" required />
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={draft.context}
              onValueChange={value => updateDraft(prev => {
                const shouldReplaceTemplate =
                  !prev.id &&
                  (prev.html === buildStarterTemplate(prev.context) || !String(prev.html || '').trim());

                return {
                  ...prev,
                  context: value,
                  category: null,
                  html: shouldReplaceTemplate ? buildStarterTemplate(value) : prev.html,
                };
              })}
              mode={Platform.OS === 'android' ? 'dropdown' : undefined}
            >
              {CONTEXT_OPTIONS.map(option => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={[styles.fieldBlock, styles.formField]}>
          <View style={styles.fieldLabelRow}>
            <FieldLabel label="Categoria" suffix={loadingMetadata ? '(carregando...)' : ''} required />
            <TouchableOpacity
              style={styles.inlineAddButton}
              activeOpacity={0.88}
              onPress={() =>
                navigation.navigate('ManagerCategoriesPage', {
                  categoryAction: Date.now(),
                  startNew: true,
                  lockContext: true,
                  presetContext: getCategoryContextForDocument(draft.context),
                })
              }>
              <Icon name="plus" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={draft.category || ''}
              onValueChange={value => updateDraft({ category: value || null })}
              mode={Platform.OS === 'android' ? 'dropdown' : undefined}
            >
              <Picker.Item label="Selecionar automaticamente" value="" />
              {categories.map(category => (
                <Picker.Item
                  key={normalizeId(category?.id || category?.['@id']) || category?.name}
                  label={category?.name || 'Categoria'}
                  value={toIri(category, 'categories') || ''}
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={[styles.fieldBlock, styles.formField]}>
          <FieldLabel
            label="Responsavel / signatario"
            suffix={loadingMetadata ? '(carregando...)' : ''}
            required
          />
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={draft.signer || ''}
              onValueChange={value => updateDraft({ signer: value || null })}
              mode={Platform.OS === 'android' ? 'dropdown' : undefined}
            >
              <Picker.Item label="Selecionar automaticamente" value="" />
              {signers.map(person => (
                <Picker.Item
                  key={normalizeId(person?.id || person?.['@id']) || person?.name}
                  label={person?.alias || person?.name || 'Pessoa'}
                  value={toIri(person, 'people') || ''}
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.snippetCard}>
        <Text style={styles.snippetTitle}>Snippets rapidos</Text>
        <Text style={styles.snippetSub}>
          Toque para inserir no cursor. O preview abaixo e estrutural e nao executa o Twig.
        </Text>
        <View style={styles.snippetWrap}>
          {activeSnippets.map(snippet => (
            <TouchableOpacity
              key={`${draft.context}-${snippet.label}`}
              style={styles.snippetButton}
              activeOpacity={0.85}
              onPress={() => insertSnippet(snippet.value)}
            >
              <Text style={styles.snippetButtonText}>{snippet.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.modeSwitch}>
        <TouchableOpacity
          style={[styles.modeButton, viewMode === 'editor' && styles.modeButtonActive]}
          activeOpacity={0.88}
          onPress={() => setViewMode('editor')}
        >
          <Icon name="edit-3" size={15} color={viewMode === 'editor' ? '#0F172A' : '#64748B'} />
          <Text style={[styles.modeButtonText, viewMode === 'editor' && styles.modeButtonTextActive]}>
            Editor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, viewMode === 'preview' && styles.modeButtonActive]}
          activeOpacity={0.88}
          onPress={() => setViewMode('preview')}
        >
          <Icon name="eye" size={15} color={viewMode === 'preview' ? '#0F172A' : '#64748B'} />
          <Text style={[styles.modeButtonText, viewMode === 'preview' && styles.modeButtonTextActive]}>
            Preview
          </Text>
        </TouchableOpacity>
      </View>

      {loadingFile ? (
        <View style={styles.editorLoading}>
          <ActivityIndicator size="small" color={brandColors.primary} />
          <Text style={styles.editorLoadingText}>Carregando HTML/Twig do arquivo vinculado...</Text>
        </View>
      ) : viewMode === 'editor' ? (
        <View style={styles.editorFieldBlock}>
          <FieldLabel label="HTML / Twig do modelo" required />
          <TextInput
            ref={editorRef}
            multiline
            value={draft.html}
            onChangeText={value => updateDraft({ html: value })}
            onSelectionChange={event => setEditorSelection(event?.nativeEvent?.selection || { start: 0, end: 0 })}
            selection={editorSelection}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Digite aqui o HTML/Twig do modelo"
            placeholderTextColor="#94A3B8"
            style={styles.editorInput}
          />
        </View>
      ) : (
        <View style={styles.previewBox}>
          {draft.html.trim() ? (
            <RenderHTML
              contentWidth={isDesktop ? width - 520 : Math.max(width - 72, 280)}
              source={{ html: draft.html }}
            />
          ) : (
            <Text style={styles.emptySub}>Adicione conteudo para visualizar o preview.</Text>
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: brandColors.background }]}>
      {isDesktop ? (
        <View style={styles.desktopShell}>
          {renderSummary()}

          <View style={styles.desktopColumns}>
            <View style={styles.sidebarPanel}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.panelContent}
              >
                {renderSidebar()}
              </ScrollView>
            </View>

            <View style={styles.editorPanel}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.panelContent}
              >
                {renderEditor()}
              </ScrollView>
            </View>
          </View>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.mobileShell}
        >
          {renderSummary()}

          <View style={styles.sidebarPanel}>
            {renderSidebar()}
          </View>

          <View style={styles.editorPanel}>
            {renderEditor()}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
