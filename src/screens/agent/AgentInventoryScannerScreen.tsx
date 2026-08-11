import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { Button } from '@/components/ui/Button';
import { theme } from '@/config/theme';
import { useAuthContext } from '@/context/AuthContext';
import { adjustInventoryQuantity, findInventoryItemByBarcode, InventoryItem } from '@/services/api/inventory.api';

export default function AgentInventoryScannerScreen() {
  const { token } = useAuthContext();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setScanning] = React.useState(true);
  const [item, setItem] = React.useState<InventoryItem | null>(null);
  const [isLoading, setLoading] = React.useState(false);
  const [notFoundCode, setNotFoundCode] = React.useState<string | null>(null);

  const handleScan = async (result: BarcodeScanningResult) => {
    if (!isScanning || !token) return;
    setScanning(false);
    setNotFoundCode(null);
    setLoading(true);
    try {
      const found = await findInventoryItemByBarcode(token, result.data);
      setItem(found);
    } catch {
      setNotFoundCode(result.data);
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (delta: number) => {
    if (!token || !item) return;
    try {
      const updated = await adjustInventoryQuantity(token, item.id, delta);
      setItem(updated);
    } catch {
      Alert.alert('Erreur', "Impossible de mettre à jour la quantité.");
    }
  };

  const reset = () => {
    setItem(null);
    setNotFoundCode(null);
    setScanning(true);
  };

  if (!permission) {
    return (
      <HeaderLayout title="Scanner l'inventaire" subtitle="Chargement" accent="Inventaire">
        <ActivityIndicator color={theme.colors.primary} />
      </HeaderLayout>
    );
  }

  if (!permission.granted) {
    return (
      <HeaderLayout title="Scanner l'inventaire" subtitle="Autorisation requise" accent="Inventaire">
        <Text style={styles.empty}>L'accès à l'appareil photo est nécessaire pour scanner un code-barres.</Text>
        <Button title="Autoriser l'appareil photo" onPress={requestPermission} />
      </HeaderLayout>
    );
  }

  return (
    <HeaderLayout title="Scanner l'inventaire" subtitle="Visez un code-barres d'article" accent="Inventaire" scrollable={false}>
      {isScanning ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'code128', 'qr', 'upc_a'] }}
            onBarcodeScanned={handleScan}
          />
        </View>
      ) : (
        <View style={styles.result}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : item ? (
            <View style={styles.card}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>
                Quantité : <Text style={styles.itemQty}>{item.quantity}</Text> {item.unit}
              </Text>
              {item.quantity <= item.minThreshold && (
                <Text style={styles.lowStock}>Stock bas (seuil : {item.minThreshold})</Text>
              )}
              <View style={styles.adjustRow}>
                <Button title="− 1" variant="ghost" onPress={() => handleAdjust(-1)} />
                <Button title="+ 1" onPress={() => handleAdjust(1)} />
              </View>
              <Button title="Scanner un autre article" variant="ghost" onPress={reset} />
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.itemName}>Article introuvable</Text>
              <Text style={styles.itemMeta}>Code scanné : {notFoundCode}</Text>
              <Button title="Réessayer" onPress={reset} />
            </View>
          )}
        </View>
      )}
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.md,
  },
  cameraWrap: {
    flex: 1,
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    minHeight: 380,
  },
  camera: {
    flex: 1,
  },
  result: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.shell,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  itemName: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 18,
    color: theme.colors.ink,
  },
  itemMeta: {
    color: theme.colors.muted,
  },
  itemQty: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.ink,
  },
  lowStock: {
    color: theme.colors.status.absent,
    fontFamily: theme.fonts.bodySemiBold,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
});
