// Filtros de catálogo exibidos na aba de produtos.
export const filterTabs = [
  { key: 'all', label: 'Todos' },
  { key: 'eligible', label: 'Elegiveis' },
  { key: 'selected', label: 'Selecionados' },
  { key: 'blocked', label: 'Com bloqueio' },
];

// Ordem e rótulos fixos usados na edição dos horários de funcionamento.
export const DAY_LABELS = {
  MONDAY: 'Segunda',
  TUESDAY: 'Terça',
  WEDNESDAY: 'Quarta',
  THURSDAY: 'Quinta',
  FRIDAY: 'Sexta',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

export const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const formatIFoodApiError = error => {
  if (!error) return 'Nao foi possivel carregar os dados da integracao iFood.';
  if (typeof error === 'string') return error;
  return error?.message || error?.description || error?.errmsg || 'Nao foi possivel carregar os dados da integracao iFood.';
};

export const calcEndTime = (start, durationMin) => {
  if (!start || durationMin == null || durationMin === '') return '--:--';
  const [hours, minutes] = start.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + Number(durationMin);
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

export const calcDuration = (start, end) => {
  const [startHours, startMinutes] = (start || '00:00').split(':').map(Number);
  const [endHours, endMinutes] = (end || '23:59').split(':').map(Number);
  let duration = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  if (duration <= 0) duration += 1440;
  return duration;
};

export const formatDateTimeLabel = value => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
