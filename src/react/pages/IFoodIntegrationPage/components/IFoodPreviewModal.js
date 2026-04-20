import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import AnimatedModal from '@controleonline/ui-crm/src/react/components/AnimatedModal';

import styles from '../styles';
import { countCollection } from '../../../utils/integrationPage';

// Modal de pré-visualização do menu antes do envio ao iFood.
export default function IFoodPreviewModal({
  visible,
  previewData,
  selectedEligible,
  accentColor,
  uploading,
  onClose,
  onUpload,
}) {
  return (
    <AnimatedModal visible={visible} onRequestClose={onClose}>
      <View style={styles.modalShell}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Pre-visualizacao do menu</Text>
              <Text style={styles.modalSubtitle}>
                {previewData?.eligible_product_count || selectedEligible.length} produtos prontos para upload
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Icon name="x" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <View style={styles.modalSummaryGrid}>
              <View style={styles.modalSummaryCard}>
                <Text style={styles.modalSummaryValue}>{countCollection(previewData?.payload?.menus)}</Text>
                <Text style={styles.modalSummaryLabel}>Menus</Text>
              </View>
              <View style={styles.modalSummaryCard}>
                <Text style={styles.modalSummaryValue}>{countCollection(previewData?.payload?.categories)}</Text>
                <Text style={styles.modalSummaryLabel}>Categorias</Text>
              </View>
              <View style={styles.modalSummaryCard}>
                <Text style={styles.modalSummaryValue}>{countCollection(previewData?.payload?.items)}</Text>
                <Text style={styles.modalSummaryLabel}>Itens</Text>
              </View>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Categorias</Text>
              {(previewData?.payload?.categories || []).map(category => (
                <View key={category.app_category_id} style={styles.previewLine}>
                  <Text style={styles.previewLineTitle}>{category.category_name}</Text>
                  <Text style={styles.previewLineMeta}>
                    {countCollection(category.app_item_ids)} item(ns)
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewSectionTitle}>Itens selecionados</Text>
              {selectedEligible.map(product => (
                <View key={product.id} style={styles.previewLine}>
                  <Text style={styles.previewLineTitle}>{product.name}</Text>
                  <Text style={styles.previewLineMeta}>
                    {product.category?.name || 'Sem categoria'} • R$ {Number(product.price || 0).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Fechar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, styles.modalPrimaryButton, { backgroundColor: accentColor }]}
              onPress={onUpload}
              disabled={uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="upload-cloud" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Publicar menu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AnimatedModal>
  );
}
