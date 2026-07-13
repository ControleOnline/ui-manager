import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@store';
import * as DocumentPicker from 'expo-document-picker';
import Icon from 'react-native-vector-icons/Feather';
import { resolveThemePalette, withOpacity } from '@controleonline/../../src/styles/branding';
import { colors } from '@controleonline/../../src/styles/colors';
import { api } from '@controleonline/ui-common/src/api';
import DefaultFile from '@controleonline/ui-default/src/react/components/files/DefaultFile';
import { useMessage } from '@controleonline/ui-common/src/react/components/MessageService';

const normalizeCollection = payload => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.member)) return payload.member;
  if (Array.isArray(payload['hydra:member'])) return payload['hydra:member'];
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const getId = value => {
  if (!value && value !== 0) return null;
  if (typeof value === 'number') return value;
  const raw = typeof value === 'string' ? value : value?.id || value?.['@id'];
  if (!raw) return null;
  const match = String(raw).match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

const isPngFile = file => {
  const mimeType = String(file?.type || file?.mimeType || '').trim().toLowerCase();
  if (mimeType === 'image/png') return true;

  const name = String(file?.name || file?.fileName || '').trim().toLowerCase();
  return name.endsWith('.png');
};

const pickSinglePngFile = () => {
  if (typeof document !== 'undefined') {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,.png';
      input.onchange = event => resolve(event?.target?.files?.[0] || null);
      input.click();
    });
  }

  return DocumentPicker.getDocumentAsync({
    type: ['image/png'],
    copyToCacheDirectory: true,
    multiple: false,
  }).then(result => {
    if (result?.canceled) return null;
    return result?.assets?.[0] || null;
  });
};

export default function MyCompaniesPage() {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const { currentCompany } = peopleStore.getters;
  const { colors: themeColors } = themeStore.getters;
  const { showError, showSuccess } = useMessage();

  const [mediaTypes, setMediaTypes] = useState([]);
  const [peopleMedia, setPeopleMedia] = useState([]);
  const [mediaTypesLoading, setMediaTypesLoading] = useState(false);
  const [peopleMediaLoading, setPeopleMediaLoading] = useState(false);
  const [uploadingByTypeId, setUploadingByTypeId] = useState({});
  const [deletingByTypeId, setDeletingByTypeId] = useState({});
  const [dragOverByTypeId, setDragOverByTypeId] = useState({});

  const palette = useMemo(
    () =>
      resolveThemePalette(
        { ...themeColors, ...(currentCompany?.theme?.colors || {}) },
        colors,
      ),
    [themeColors, currentCompany?.id],
  );
  const companyIri = currentCompany?.id ? `/people/${currentCompany.id}` : '';
  const mediaByTypeId = useMemo(
    () =>
      normalizeCollection(peopleMedia).reduce((accumulator, item) => {
        const mediaTypeId = getId(item?.mediaType);
        if (mediaTypeId) {
          accumulator[String(mediaTypeId)] = item;
        }
        return accumulator;
      }, {}),
    [peopleMedia],
  );

  const loadMediaTypes = useCallback(async () => {
    setMediaTypesLoading(true);

    try {
      const response = await api.fetch('/media_types', {
        params: {
          peopleType: 'J',
          itemsPerPage: 100,
        },
      });

      setMediaTypes(normalizeCollection(response));
    } catch (error) {
      setMediaTypes([]);
      showError(error?.message || 'Nao foi possivel carregar os tipos de midia.');
    } finally {
      setMediaTypesLoading(false);
    }
  }, [showError]);

  const loadPeopleMedia = useCallback(async () => {
    if (!companyIri) {
      setPeopleMedia([]);
      return;
    }

    setPeopleMediaLoading(true);

    try {
      const response = await api.fetch('/people_media', {
        params: {
          people: companyIri,
          'mediaType.peopleType': 'J',
          itemsPerPage: 100,
        },
      });

      setPeopleMedia(normalizeCollection(response));
    } catch (error) {
      setPeopleMedia([]);
      showError(error?.message || 'Nao foi possivel carregar as midias da empresa.');
    } finally {
      setPeopleMediaLoading(false);
    }
  }, [companyIri, showError]);

  useEffect(() => {
    loadMediaTypes();
  }, [loadMediaTypes]);

  useEffect(() => {
    loadPeopleMedia();
  }, [loadPeopleMedia]);

  const confirmMediaDeletion = useCallback(mediaTypeLabel => {
    const normalizedLabel = String(mediaTypeLabel || 'esta midia').trim();
    const message = `Deseja apagar a vinculacao da midia "${normalizedLabel}"?`;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return Promise.resolve(window.confirm(message));
    }

    return new Promise(resolve => {
      Alert.alert(
        'Confirmacao',
        message,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Apagar', style: 'destructive', onPress: () => resolve(true) },
        ],
      );
    });
  }, []);

  const uploadMediaFile = useCallback(
    async (mediaType, providedFile = null) => {
      const mediaTypeId = getId(mediaType);
      if (!companyIri || !mediaTypeId) {
        showError('Nao foi possivel identificar a empresa ou o tipo da midia.');
        return;
      }

      const selectedFile = providedFile || (await pickSinglePngFile());
      if (!selectedFile) return;

      if (!isPngFile(selectedFile)) {
        showError('Envie apenas arquivos PNG.');
        return;
      }

      setUploadingByTypeId(current => ({
        ...current,
        [mediaTypeId]: true,
      }));

      try {
        const formData = new FormData();

        if (Platform.OS === 'web') {
          formData.append('file', selectedFile);
        } else {
          formData.append('file', {
            uri: selectedFile.uri,
            name: selectedFile.name || `${mediaType?.type || 'media'}.png`,
            type: selectedFile.mimeType || 'image/png',
          });
        }

        formData.append('people', companyIri);
        formData.append('media_type_id', String(mediaTypeId));

        await api.upload('/people_media/upload', formData);
        await loadPeopleMedia();
        showSuccess(`${mediaType?.type || 'Midia'} atualizada com sucesso.`);
      } catch (error) {
        showError(error?.response?.data?.['hydra:description'] || error?.message || 'Nao foi possivel enviar a midia.');
      } finally {
        setUploadingByTypeId(current => ({
          ...current,
          [mediaTypeId]: false,
        }));
      }
    },
    [companyIri, loadPeopleMedia, showError, showSuccess],
  );

  const deleteMediaLink = useCallback(
    async mediaType => {
      const mediaTypeId = getId(mediaType);
      const currentMedia = mediaByTypeId[String(mediaTypeId)] || null;
      const peopleMediaId = getId(currentMedia);

      if (!mediaTypeId || !peopleMediaId) {
        showError('Nao foi possivel identificar a midia para apagar.');
        return;
      }

      const shouldDelete = await confirmMediaDeletion(mediaType?.type || 'Midia');
      if (!shouldDelete) {
        return;
      }

      setDeletingByTypeId(current => ({
        ...current,
        [mediaTypeId]: true,
      }));

      try {
        await api.fetch(`/people_media/${peopleMediaId}`, {
          method: 'DELETE',
        });
        await loadPeopleMedia();
        showSuccess(`${mediaType?.type || 'Midia'} removida com sucesso.`);
      } catch (error) {
        showError(error?.response?.data?.['hydra:description'] || error?.message || 'Nao foi possivel apagar a midia.');
      } finally {
        setDeletingByTypeId(current => ({
          ...current,
          [mediaTypeId]: false,
        }));
      }
    },
    [confirmMediaDeletion, loadPeopleMedia, mediaByTypeId, showError, showSuccess],
  );

  const handleDrop = useCallback(
    async (mediaType, event) => {
      if (Platform.OS !== 'web') return;

      event?.preventDefault?.();
      event?.stopPropagation?.();

      const mediaTypeId = getId(mediaType);
      if (mediaTypeId) {
        setDragOverByTypeId(current => ({
          ...current,
          [mediaTypeId]: false,
        }));
      }

      const droppedFile =
        event?.nativeEvent?.dataTransfer?.files?.[0]
        || event?.dataTransfer?.files?.[0]
        || null;
      if (!droppedFile) return;

      await uploadMediaFile(mediaType, droppedFile);
    },
    [uploadMediaFile],
  );

  const renderMediaDropZone = useCallback(
    ({ currentMedia, isDragOver, isUploading, mediaType, mediaTypeId, paletteColors }) => {
      const sharedContent = (
        <>
          <View
            style={[
              styles.mediaPreviewFrame,
              {
                backgroundColor: paletteColors.panelBackground || colors.white,
                borderColor: withOpacity(paletteColors.text || colors.text, 0.08),
              },
            ]}
          >
            {currentMedia?.file ? (
              <DefaultFile
                source={currentMedia.file}
                company={currentCompany}
                resizeMode="contain"
                style={styles.mediaPreviewImage}
              />
            ) : (
              <View style={styles.mediaEmptyState}>
                <Icon
                  name="image"
                  size={24}
                  color={withOpacity(paletteColors.textSecondary || '#64748B', 0.9)}
                />
                <Text
                  style={[
                    styles.mediaEmptyText,
                    { color: paletteColors.textSecondary || '#64748B' },
                  ]}
                >
                  Sem imagem salva
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.mediaHelpText, { color: paletteColors.textSecondary || '#64748B' }]}>
            {isUploading
              ? 'Enviando arquivo...'
              : Platform.OS === 'web'
                ? 'Clique para enviar ou arraste um PNG até aqui.'
                : 'Toque para enviar um arquivo PNG.'}
          </Text>
        </>
      );

      if (Platform.OS !== 'web') {
        return (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => uploadMediaFile(mediaType)}
            disabled={isUploading}
          >
            {sharedContent}
          </TouchableOpacity>
        );
      }

      return React.createElement(
        'div',
        {
          onClick: () => {
            if (!isUploading) {
              uploadMediaFile(mediaType);
            }
          },
          onDragOver: event => {
            event.preventDefault();
            if (event.dataTransfer) {
              event.dataTransfer.dropEffect = 'copy';
            }
          },
          onDragEnter: event => {
            event.preventDefault();
            setDragOverByTypeId(current => ({
              ...current,
              [mediaTypeId]: true,
            }));
          },
          onDragLeave: event => {
            event.preventDefault();
            const relatedTarget = event.relatedTarget;
            if (relatedTarget && event.currentTarget?.contains?.(relatedTarget)) {
              return;
            }
            setDragOverByTypeId(current => ({
              ...current,
              [mediaTypeId]: false,
            }));
          },
          onDrop: async event => {
            event.preventDefault();
            setDragOverByTypeId(current => ({
              ...current,
              [mediaTypeId]: false,
            }));
            const droppedFile = event.dataTransfer?.files?.[0] || null;
            if (!droppedFile) return;
            await uploadMediaFile(mediaType, droppedFile);
          },
          style: {
            cursor: isUploading ? 'progress' : 'pointer',
            display: 'block',
          },
        },
        sharedContent,
      );
    },
    [currentCompany, setDragOverByTypeId, uploadMediaFile],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: palette.panelBackground || colors.white,
              borderColor: withOpacity(palette.text || colors.text, 0.08),
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.text || colors.text }]}>
            Dados da empresa
          </Text>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: palette.panelBackground || colors.white,
              borderColor: withOpacity(palette.text || colors.text, 0.08),
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: palette.text || colors.text }]}>
            Midias
          </Text>

          <Text style={[styles.sectionDescription, { color: palette.textSecondary || '#64748B' }]}>
            Envie arquivos PNG para cada tipo de midia da empresa. A prévia abaixo sempre reflete o que já está salvo no banco.
          </Text>

          {mediaTypesLoading || peopleMediaLoading ? (
            <View style={styles.mediaLoadingState}>
              <ActivityIndicator size="small" color={palette.primary || '#2563EB'} />
            </View>
          ) : (
            <View style={styles.mediaGrid}>
              {mediaTypes.map(mediaType => {
                const mediaTypeId = getId(mediaType);
                const currentMedia = mediaByTypeId[String(mediaTypeId)] || null;
                const isUploading = Boolean(uploadingByTypeId[mediaTypeId]);
                const isDeleting = Boolean(deletingByTypeId[mediaTypeId]);
                const isDragOver = Boolean(dragOverByTypeId[mediaTypeId]);

                return (
                  <View
                    key={mediaTypeId || mediaType?.type}
                    style={[
                      styles.mediaCard,
                      {
                        backgroundColor: withOpacity(palette.primary || '#2563EB', isDragOver ? 0.12 : 0.04),
                        borderColor: withOpacity(
                          palette.primary || '#2563EB',
                          isDragOver ? 0.4 : 0.14,
                        ),
                      },
                    ]}
                  >
                    <View style={styles.mediaCardHeader}>
                      <Text style={[styles.mediaCardTitle, { color: palette.text || colors.text }]}>
                        {String(mediaType?.type || '').trim() || 'Midia'}
                      </Text>
                      <View style={styles.mediaHeaderActions}>
                        {currentMedia ? (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => deleteMediaLink(mediaType)}
                            disabled={isDeleting || isUploading}
                            style={[
                              styles.mediaDeleteButton,
                              {
                                backgroundColor: withOpacity(palette.error || '#DC2626', 0.1),
                              },
                            ]}
                          >
                            {isDeleting ? (
                              <ActivityIndicator
                                size="small"
                                color={palette.error || '#DC2626'}
                              />
                            ) : (
                              <Icon
                                name="trash-2"
                                size={16}
                                color={palette.error || '#DC2626'}
                              />
                            )}
                          </TouchableOpacity>
                        ) : null}
                        <View
                          style={[
                            styles.mediaBadge,
                            { backgroundColor: withOpacity(palette.primary || '#2563EB', 0.12) },
                          ]}
                        >
                          <Text style={[styles.mediaBadgeText, { color: palette.primary || '#2563EB' }]}>
                            PNG
                          </Text>
                        </View>
                      </View>
                    </View>

                    {renderMediaDropZone({
                      currentMedia,
                      isDragOver,
                      isUploading: isUploading || isDeleting,
                      mediaType,
                      mediaTypeId,
                      paletteColors: palette,
                    })}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 32,
    gap: 16,
  },
  sectionCard: {
    minHeight: 160,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  mediaLoadingState: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 16,
  },
  mediaCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    minHeight: 250,
  },
  mediaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mediaHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  mediaDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  mediaBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  mediaPreviewFrame: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 140,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPreviewImage: {
    width: '100%',
    height: 140,
  },
  mediaEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mediaEmptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  mediaHelpText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
  },
});
