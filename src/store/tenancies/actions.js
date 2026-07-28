import { api } from '@controleonline/ui-common/src/api';

const readItems = response =>
  response?.items ||
  response?.response?.items ||
  response?.response?.data?.items ||
  response?.data?.items ||
  [];

export async function loadItems({ commit }, params = {}) {
  commit('SET_LOADING', true);
  commit('SET_ERROR', '');

  try {
    const response = await api.fetch('tenancies', {
      method: 'GET',
      params,
    });
    const items = readItems(response);
    commit('SET_ITEMS', items);
    return items;
  } catch (error) {
    commit('SET_ERROR', error?.message || 'Falha ao carregar tenancies.');
    throw error;
  } finally {
    commit('SET_LOADING', false);
  }
}

export async function saveItem({ commit }, payload = {}) {
  commit('SET_SAVING', true);
  commit('SET_ERROR', '');

  try {
    const id = String(payload?.id || '').replace(/\D+/g, '');
    const response = await api.fetch(id ? `tenancies/${id}` : 'tenancies', {
      method: id ? 'PUT' : 'POST',
      body: payload,
    });
    commit('UPSERT_ITEM', response);
    return response;
  } catch (error) {
    commit('SET_ERROR', error?.message || 'Falha ao salvar tenancy.');
    throw error;
  } finally {
    commit('SET_SAVING', false);
  }
}

export async function enqueueInstall({ commit }, payload = {}) {
  const id = String(payload?.id || payload || '').replace(/\D+/g, '');
  if (!id) {
    return null;
  }

  commit('SET_SAVING', true);
  commit('SET_ERROR', '');

  try {
    const response = await api.fetch(`tenancies/${id}/install`, {
      method: 'POST',
      body: {},
    });
    commit('UPSERT_ITEM', response);
    return response;
  } catch (error) {
    commit('SET_ERROR', error?.message || 'Falha ao reenfileirar instalação.');
    throw error;
  } finally {
    commit('SET_SAVING', false);
  }
}
