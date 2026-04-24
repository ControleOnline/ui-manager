import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { withOpacity } from '@controleonline/../../src/styles/branding';

import styles from '../styles';
import { calcEndTime, DAY_LABELS, DAY_ORDER, formatDateTimeLabel } from '../utils';

// Aba com operação diária: disponibilidade e horários da loja.
export default function IFoodOperationsTab({
  shadowStyle,
  connected,
  storeStatus,
  activeInterruptions,
  actionLoading,
  onStoreOpen,
  onStoreClose,
  onRefreshStatus,
  hours,
  hoursLoading,
  hoursEditing,
  onStartEditHours,
  hoursDraft,
  onUpdateHoursDraft,
  onAddHoursShift,
  onRemoveHoursShift,
  hoursSaving,
  onSaveHours,
  onCancelEditHours,
}) {
  if (!connected) {
    return (
      <View style={[styles.sectionCard, shadowStyle]}>
        <Text style={styles.sectionTitle}>Operacao da loja</Text>
        <View style={styles.helperRow}>
          <Text style={styles.helperText}>
            Conecte a loja primeiro para consultar disponibilidade, pausas ativas e horários do iFood.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.sectionCard, shadowStyle]}>
        <View style={styles.statusRow}>
          <Text style={styles.sectionTitle}>Disponibilidade da loja</Text>
          {storeStatus?.data != null && (
            <View
              style={[
                styles.availBadge,
                {
                  backgroundColor: withOpacity(storeStatus.data.online ? '#16A34A' : '#DC2626', 0.12),
                },
              ]}>
              <View
                style={[
                  styles.availDot,
                  { backgroundColor: storeStatus.data.online ? '#16A34A' : '#DC2626' },
                ]}
              />
              <Text
                style={[
                  styles.availBadgeText,
                  { color: storeStatus.data.online ? '#166534' : '#991B1B' },
                ]}>
                {storeStatus.data.online ? 'Online' : 'Offline'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.helperText}>
          {storeStatus?.data != null
            ? storeStatus.data.online
              ? 'A loja esta aceitando pedidos no iFood.'
              : `A loja esta fechada para novos pedidos.${activeInterruptions.length > 0 ? ` ${activeInterruptions.length} interrupcao(oes) ativa(s).` : ''}`
            : 'Consulte ou altere a disponibilidade da loja para receber pedidos.'}
        </Text>

        {activeInterruptions.length > 0 && (
          <View style={styles.interruptionsBox}>
            <Text style={styles.interruptionsTitle}>Pausas ativas</Text>
            {activeInterruptions.map((interruption, index) => (
              <View key={String(interruption?.id || index)} style={styles.interruptionItem}>
                <Text style={styles.interruptionText}>
                  {interruption?.description || 'Interrupcao ativa'}
                </Text>
                <Text style={styles.interruptionMeta}>
                  Inicio: {formatDateTimeLabel(interruption?.start)}
                </Text>
                <Text style={styles.interruptionMeta}>
                  Fim: {formatDateTimeLabel(interruption?.end)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {Array.isArray(storeStatus?.data?.operations) && (() => {
          const storeOnline = storeStatus.data.online === true;
          const visibleOperations = storeStatus.data.operations.filter(
            operation => storeOnline || operation.state !== 'ERROR',
          );

          if (visibleOperations.length === 0) return null;

          return (
            <View style={styles.opsGrid}>
              {visibleOperations.map((operation, index) => {
                const online = operation.state === 'OK' || operation.state === 'WARNING';
                const tone =
                  operation.state === 'OK'
                    ? '#16A34A'
                    : operation.state === 'WARNING'
                      ? '#D97706'
                      : '#DC2626';

                return (
                  <View
                    key={`${operation?.operation || 'operation'}-${index}`}
                    style={[
                      styles.opChip,
                      {
                        borderColor: withOpacity(tone, 0.3),
                        backgroundColor: withOpacity(tone, 0.08),
                      },
                    ]}>
                    <Icon name={online ? 'check-circle' : 'x-circle'} size={12} color={tone} />
                    <Text style={[styles.opChipText, { color: tone }]}>
                      {operation.operation}
                      {operation.sales_channel ? ` · ${operation.sales_channel}` : ''}
                      {`: ${operation.state_label}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })()}

        <View style={styles.availRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.availButton,
              { backgroundColor: '#16A34A' },
              (actionLoading === 'store_open' || storeStatus?.data?.online === true) && styles.availButtonDisabled,
            ]}
            onPress={onStoreOpen}
            disabled={actionLoading !== null || storeStatus?.data?.online === true}>
            {actionLoading === 'store_open' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon name="check-circle" size={15} color="#FFFFFF" />
                <Text style={styles.availButtonText}>Abrir loja</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.availButton,
              { backgroundColor: '#DC2626' },
              (actionLoading === 'store_close' || storeStatus?.data?.online === false) && styles.availButtonDisabled,
            ]}
            onPress={onStoreClose}
            disabled={actionLoading !== null || storeStatus?.data?.online === false}>
            {actionLoading === 'store_close' ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon name="x-circle" size={15} color="#FFFFFF" />
                <Text style={styles.availButtonText}>Fechar loja</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.availRefreshButton}
            onPress={onRefreshStatus}
            disabled={actionLoading !== null}>
            <Icon name="refresh-cw" size={15} color="#64748B" />
          </TouchableOpacity>
        </View>

        {storeStatus?.errno !== 0 && storeStatus?.errno != null && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Erro ao consultar disponibilidade</Text>
            <Text style={styles.errorText}>{storeStatus.errmsg}</Text>
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, shadowStyle]}>
        <View style={styles.statusRow}>
          <Text style={styles.sectionTitle}>Horarios de funcionamento</Text>
          {!hoursEditing && (
            <TouchableOpacity
              onPress={onStartEditHours}
              style={styles.hoursEditBtn}
              disabled={hoursLoading}>
              <Icon name="edit-2" size={13} color="#0EA5E9" />
              <Text style={styles.hoursEditBtnText}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        {hoursLoading && <ActivityIndicator size="small" color="#0EA5E9" />}

        {!hoursLoading && !hoursEditing && (
          Array.isArray(hours) && hours.length > 0 ? (
            <View style={styles.hoursList}>
              {DAY_ORDER.map(day => {
                const entry = hours.find(item => item.dayOfWeek === day);
                const isOpen = !!entry && (entry.shifts || []).length > 0;

                return (
                  <View key={day} style={styles.hoursDayRow}>
                    <Text style={[styles.hoursDayLabel, !isOpen && { color: '#94A3B8' }]}>
                      {DAY_LABELS[day]}
                    </Text>
                    <View style={styles.hoursValues}>
                      {isOpen ? (
                        (entry.shifts || []).map((shift, index) => (
                          <Text key={`${day}-${index}`} style={styles.hoursValue}>
                            {shift.start} – {calcEndTime(shift.start, shift.duration)}
                          </Text>
                        ))
                      ) : (
                        <Text style={styles.hoursClosed}>Fechado</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.helperText}>Nenhum horario configurado. Toque em Editar para definir.</Text>
          )
        )}

        {hoursEditing && Array.isArray(hoursDraft) && (
          hoursDraft.length > 0 ? (
            <View style={styles.hoursEditList}>
              {DAY_ORDER.map(day => {
                const entry =
                  hoursDraft.find(item => item.dayOfWeek === day) || {
                    dayOfWeek: day,
                    open: false,
                    shifts: [{ start: '09:00', duration: 840 }],
                  };

                return (
                  <View key={day} style={[styles.hoursDayRow, { alignItems: 'center' }]}>
                    <TouchableOpacity
                      onPress={() => onUpdateHoursDraft(day, null, 'open', !entry.open)}
                      disabled={hoursSaving}
                      style={[styles.dayToggle, entry.open && styles.dayToggleOn]}>
                      <View style={[styles.dayToggleThumb, entry.open && styles.dayToggleThumbOn]} />
                    </TouchableOpacity>

                    <Text style={[styles.hoursDayLabel, !entry.open && { color: '#94A3B8' }]}>
                      {DAY_LABELS[day]}
                    </Text>

                    {entry.open ? (
                      <View style={styles.hoursEditContent}>
                        {(entry.shifts || []).map((shift, index) => (
                          <View key={`${day}-shift-${index}`} style={styles.hoursInputRow}>
                            <TextInput
                              value={shift.start}
                              onChangeText={value => onUpdateHoursDraft(day, index, 'start', value)}
                              style={styles.hoursInput}
                              placeholder="HH:MM"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numbers-and-punctuation"
                              editable={!hoursSaving}
                            />
                            <Text style={styles.hoursSep}>–</Text>
                            <TextInput
                              value={calcEndTime(shift.start, shift.duration)}
                              onChangeText={value => onUpdateHoursDraft(day, index, 'end', value)}
                              style={styles.hoursInput}
                              placeholder="HH:MM"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numbers-and-punctuation"
                              editable={!hoursSaving}
                            />
                            {(entry.shifts || []).length > 1 && (
                              <TouchableOpacity
                                onPress={() => onRemoveHoursShift(day, index)}
                                disabled={hoursSaving}
                                style={styles.hoursShiftRemoveBtn}>
                                <Icon name="trash-2" size={14} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                        <TouchableOpacity
                          onPress={() => onAddHoursShift(day)}
                          disabled={hoursSaving}
                          style={styles.hoursShiftAddBtn}>
                          <Icon name="plus" size={14} color="#0EA5E9" />
                          <Text style={styles.hoursShiftAddText}>Adicionar turno</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.hoursClosed}>Fechado</Text>
                    )}
                  </View>
                );
              })}

              <View style={styles.availRow}>
                <TouchableOpacity
                  onPress={onSaveHours}
                  disabled={hoursSaving}
                  style={[styles.actionButton, { backgroundColor: '#16A34A' }]}>
                  {hoursSaving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Icon name="check" size={15} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Salvar horarios</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onCancelEditHours}
                  disabled={hoursSaving}
                  style={styles.hoursCancelBtn}>
                  <Text style={styles.hoursCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.hoursEditList}>
              <View style={styles.helperRow}>
                <Text style={styles.helperText}>
                  Nenhum horario retornado pelo iFood. Sincronize o catalogo e tente novamente.
                </Text>
              </View>

              <TouchableOpacity onPress={onCancelEditHours} style={styles.hoursCancelBtn}>
                <Text style={styles.hoursCancelText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </View>
    </>
  );
}
