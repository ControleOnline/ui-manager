import React, {useMemo} from 'react';
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import styles from './NetworkPrinterPreviewModal.styles';

const tt = key => global.t?.t('configs', 'printPreview', key);

const clampColumns = value => {
  const parsedValue = Number(String(value || '').replace(/\D+/g, ''));
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return 48;
  }

  return Math.min(Math.max(parsedValue, 24), 80);
};

const safeText = value => String(value || '').trim();

const normalizePreviewLine = line => {
  if (line && typeof line === 'object') {
    return {
      ...line,
      text: safeText(line.text),
    };
  }

  return {
    text: safeText(line),
  };
};

const centerLine = (value, columns) => {
  const text = safeText(value);
  if (text.length >= columns) {
    return text.slice(0, columns);
  }

  const leftPad = Math.floor((columns - text.length) / 2);
  return `${' '.repeat(leftPad)}${text}`;
};

const wrapLine = (value, columns) => {
  const words = safeText(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if (!currentLine) {
      currentLine = word;
      return;
    }

    if (`${currentLine} ${word}`.length <= columns) {
      currentLine = `${currentLine} ${word}`;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
};

const wrapPreviewLine = (line, columns) => {
  const normalizedLine = normalizePreviewLine(line);
  return wrapLine(normalizedLine.text, columns).map(text => ({
    ...normalizedLine,
    text,
  }));
};

const NetworkPrinterPreviewModal = ({
  visible = false,
  onClose,
  codePage = '',
  columns,
  documents = [],
  error = '',
  logoUrl = '',
  loading = false,
  printerModel,
  printerManufacturer,
  subtitle = '',
  title = '',
  transport,
}) => {
  const normalizedColumns = useMemo(() => clampColumns(columns), [columns]);
  const normalizedDocuments = useMemo(
    () => (Array.isArray(documents) ? documents : []),
    [documents],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{title || tt('title') || 'Visualizacao da impressao'}</Text>
              <Text style={styles.subtitle}>
                {subtitle ||
                  tt('subtitle') ||
                  'Simulacao local para conferir largura, quebras e campos do cupom.'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.85}
              onPress={onClose}>
              <Icon name="x" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.metaGrid}>
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>
                  {`${normalizedColumns} ${tt('columns') || 'colunas'}`}
                </Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>
                  {`${tt('codePage') || 'Code page'}: ${safeText(codePage) || 'cp850'}`}
                </Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>
                  {safeText(transport) || tt('transportFallback') || 'tcp-raw'}
                </Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>
                  {[printerManufacturer, printerModel]
                    .map(safeText)
                    .filter(Boolean)
                    .join(' ') || tt('modelMissing') || 'Modelo nao informado'}
                </Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>{tt('loadingRealData') || 'Carregando dados reais...'}</Text>
              </View>
            ) : error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : normalizedDocuments.length > 0 ? (
              normalizedDocuments.map((document, index) => {
                const lines = Array.isArray(document?.lines)
                  ? document.lines
                  : [];
                const defaultHeaderLines = document?.hideDefaultHeader
                  ? []
                  : [
                      {
                        text: centerLine(
                          document?.title || `${tt('copy') || 'Via'} ${index + 1}`,
                          normalizedColumns,
                        ),
                      },
                      document?.subtitle
                        ? {text: centerLine(document.subtitle, normalizedColumns)}
                        : null,
                      {text: '-'.repeat(normalizedColumns)},
                    ].filter(Boolean);
                const paperLines = [
                  ...defaultHeaderLines,
                  ...lines.flatMap(line => wrapPreviewLine(line, normalizedColumns)),
                ].filter(Boolean);
                const receiptWidth = normalizedColumns * 8;

                return (
                  <View key={`${document?.title || 'preview'}-${index}`}>
                    {index > 0 ? (
                      <View style={styles.cutLine}>
                        <Text style={styles.cutText}>{tt('cutLine') || 'picote'}</Text>
                      </View>
                    ) : null}
                    <View style={styles.paper}>
                      <View style={[styles.receiptWrap, {width: receiptWidth}]}>
                        {logoUrl && !document?.hideLogo ? (
                          <View style={styles.logoWrap}>
                            <Image
                              source={{uri: logoUrl}}
                              style={styles.logo}
                              resizeMode="contain"
                            />
                          </View>
                        ) : null}
                        {paperLines.map((line, lineIndex) => (
                          <Text
                            key={`${document?.title || 'preview'}-${index}-${lineIndex}`}
                            style={[
                              styles.receiptText,
                              line.center ? styles.receiptTextCenter : null,
                              line.bold ? styles.receiptTextBold : null,
                              line.reverse ? styles.receiptTextReverse : null,
                              line.reverse && line.center
                                ? styles.receiptTextReverseCenter
                                : null,
                              line.large ? styles.receiptTextLarge : null,
                            ]}>
                            {line.text || ' '}
                          </Text>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>
                  {tt('emptyData') || 'Nenhum dado real encontrado para visualizar.'}
                </Text>
              </View>
            )}

            <Text style={styles.hint}>
              {tt('hint') ||
                'Esta visualizacao ainda nao envia dados para a impressora. Os blocos separados simulam os cortes de papel usados pelas filas.'}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default NetworkPrinterPreviewModal;
