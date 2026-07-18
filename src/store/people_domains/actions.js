import { api } from '@controleonline/ui-common/src/api';

const normalizeText = value => String(value ?? '').trim();
let detailLoadRequestId = 0;

const extractId = value =>
  normalizeText(value?.id ?? value?.['@id'] ?? value).replace(/\D+/g, '');

const readErrorMessage = (error, fallback) => {
  if (typeof error === 'string') {
    return normalizeText(error) || fallback;
  }

  if (Array.isArray(error?.message)) {
    const message = error.message
      .map(item => normalizeText(item?.message || item?.title || item))
      .filter(Boolean)
      .join('\n');

    return message || fallback;
  }

  return normalizeText(error?.message || error?.description || '') || fallback;
};

export async function loadDetail({ commit }, payload = {}) {
  const id = extractId(payload?.id ?? payload);
  const requestId = ++detailLoadRequestId;

  if (!id) {
    commit('SET_DETAIL_ERROR', 'ID inválido.');
    return null;
  }

  commit('SET_DETAIL_LOADING', true);
  commit('SET_DETAIL_ERROR', '');
  commit('SET_SERVER', null);
  commit('SET_LINKED_ITEM', null);
  commit('SET_FRONT_ITEMS', []);
  commit('SET_TEST_DOMAIN', '');

  try {
    const item = await api.fetch(`people_domains/${id}/overview`);
    if (requestId !== detailLoadRequestId) {
      return null;
    }
    commit('SET_ITEM', item);
    commit('SET_LINKED_ITEM', item?.apiPeopleDomain || null);
    commit('SET_FRONT_ITEMS', Array.isArray(item?.linkedFrontDomains) ? item.linkedFrontDomains : []);
    commit('SET_SERVER', item?.server || null);
    commit('SET_TEST_DOMAIN', item?.testsDomain || '');

    return {
      item,
      linkedItem: item?.apiPeopleDomain || null,
      testDomain: item?.testsDomain || '',
    };
  } catch (error) {
    if (requestId !== detailLoadRequestId) {
      return null;
    }
    const message = readErrorMessage(error, 'Falha ao carregar o domínio.');
    commit('SET_DETAIL_ERROR', message);
    throw error;
  } finally {
    if (requestId === detailLoadRequestId) {
      commit('SET_DETAIL_LOADING', false);
    }
  }
}

export function resetDetail({ commit }) {
  detailLoadRequestId += 1;
  commit('SET_DETAIL_LOADING', false);
  commit('SET_DETAIL_ERROR', '');
  commit('SET_LINKED_ITEM', null);
  commit('SET_FRONT_ITEMS', []);
  commit('SET_SERVER', null);
  commit('SET_TEST_DOMAIN', '');
}
