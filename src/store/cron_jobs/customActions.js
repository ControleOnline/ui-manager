import * as defaultActions from '@controleonline/ui-default/src/store/default/actions';

const CRON_JOB_ENTITY_CLASS = 'ControleOnline\\Entity\\CronJob';
const ENTITY_LOG_STORE = 'entity_log';

const resolveCronJobLogStatus = log => {
  const action = String(log?.action || log?.level || '').trim().toLowerCase();
  if (!action) {
    return '';
  }

  return ['error', 'critical'].includes(action) ? 'Falha' : 'Sucesso';
};

const loadLastLogForCronJob = async (context, cronJobId) => {
  const normalizedId = Number(cronJobId || 0);
  if (!normalizedId) {
    return null;
  }

  const response = await context.dispatch(
    `${ENTITY_LOG_STORE}/getTimeline`,
    {
      class: CRON_JOB_ENTITY_CLASS,
      row: normalizedId,
      'order[createdAt]': 'desc',
    },
    {root: true},
  );

  const logs = Array.isArray(response?.items) ? response.items : [];
  return logs[0] || null;
};

const enrichCronJobsWithLastLog = async (context, items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return items;
  }

  return Promise.all(
    items.map(async item => {
      try {
        const lastLog = await loadLastLogForCronJob(context, item?.id);
        if (!lastLog) {
          return item;
        }

        return {
          ...item,
          lastExecution: lastLog.createdAt || '',
          lastStatus: resolveCronJobLogStatus(lastLog),
        };
      } catch {
        return item;
      }
    }),
  );
};

export const getItems = async (context, params = {}) => {
  const items = await defaultActions.getItems(context, params);
  const enrichedItems = await enrichCronJobsWithLastLog(
    context,
    Array.isArray(items) ? items : [],
  );

  if (enrichedItems !== items) {
    context.commit('SET_ITEMS', enrichedItems);
  }

  return enrichedItems;
};
