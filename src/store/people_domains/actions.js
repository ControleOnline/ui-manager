import { api } from '@controleonline/ui-common/src/api';

const normalizeText = value => String(value ?? '').trim();
let detailLoadRequestId = 0;

const normalizeCollectionItems = response => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.member)) {
    return response.member;
  }

  if (Array.isArray(response?.['hydra:member'])) {
    return response['hydra:member'];
  }

  return [];
};

const extractId = value =>
  normalizeText(value?.id ?? value?.['@id'] ?? value).replace(/\D+/g, '');

const resolveTestDomain = (item, linkedItem) => {
  const itemType = normalizeText(item?.domainType).toUpperCase();

  if (itemType === 'API') {
    return normalizeText(item?.domain);
  }

  return normalizeText(linkedItem?.domain || item?.domain || '');
};

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
    const item = await api.fetch(`people_domains/${id}`);
    if (requestId !== detailLoadRequestId) {
      return null;
    }
    commit('SET_ITEM', item);

    const linkedId = extractId(item?.apiPeopleDomain);
    let linkedItem = null;

    if (linkedId && linkedId !== id) {
      linkedItem = await api.fetch(`people_domains/${linkedId}`);
      if (requestId !== detailLoadRequestId) {
        return null;
      }
      commit('SET_LINKED_ITEM', linkedItem);
    }

    const testDomain = resolveTestDomain(item, linkedItem);
    if (requestId !== detailLoadRequestId) {
      return null;
    }
    commit('SET_TEST_DOMAIN', testDomain);

    if (testDomain) {
      const serverResponse = await api.fetch('people-domains/server', {
        params: {
          domain: testDomain,
        },
      });

      if (requestId !== detailLoadRequestId) {
        return null;
      }
      commit('SET_SERVER', serverResponse?.server || null);
    }

    if (normalizeText(item?.domainType).toUpperCase() === 'API') {
      const frontsResponse = await api.fetch('people_domains', {
        params: {
          apiPeopleDomain: `/people_domains/${id}`,
        },
      });

      if (requestId !== detailLoadRequestId) {
        return null;
      }
      commit('SET_FRONT_ITEMS', normalizeCollectionItems(frontsResponse));
    }

    return {
      item,
      linkedItem,
      testDomain,
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
