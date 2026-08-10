import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { Section } from '@/components/ui/Section';
import { Intervention } from '@/types/intervention';
import { getInterventionById, updateInterventionStatus } from '@/services/api/interventions.api';
import { theme } from '@/config/theme';
import { Button } from '@/components/ui/Button';
import { getCurrentCoordinates, verifyProximityToSite } from '@/utils/location';
import { checkIn, checkOut, heartbeat, markArrival } from '@/services/api/attendance.api';
import { AnomalyType } from '@/types/anomaly';
import { createAnomaly } from '@/services/api/anomalies.api';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useSyncContext } from '@/context/SyncContext';
import { useAuthContext } from '@/context/AuthContext';
import { getSite } from '@/services/api/sites.api';
import { Site } from '@/types/site';
import { AgentStackParamList } from '@/navigation/types';
import { RunningTimer } from '@/components/intervention/RunningTimer';
import { AssignedAgentsList } from '@/components/intervention/AssignedAgentsList';
import { ProblemModal } from '@/components/intervention/ProblemModal';
import { getActualDate, buildDateTime, formatTime } from '@/utils/interventionTime';

const TYPE_LABELS = {
  REGULAR: 'Intervention régulière',
  PUNCTUAL: 'Intervention ponctuelle',
};

const STATUS_LABELS: Record<Intervention['status'], string> = {
  PLANNED: 'Planifiée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  NO_SHOW: 'Non effectuée',
  NEEDS_REVIEW: 'À valider',
};

const START_CACHE_KEY = (id: string) => `intervention:start:${id}`;

export default function InterventionDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AgentStackParamList>>();
  const route = useRoute<RouteProp<AgentStackParamList, 'AgentIntervention'>>();
  const { id } = route.params;
  const [intervention, setIntervention] = React.useState<Intervention | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isProblemModalVisible, setProblemModalVisible] = React.useState(false);
  const [problemType, setProblemType] = React.useState<AnomalyType>('CLEANLINESS');
  const [problemDescription, setProblemDescription] = React.useState('');
  const [problemPhotos, setProblemPhotos] = React.useState<string[]>([]);
  const [isSubmittingProblem, setSubmittingProblem] = React.useState(false);
  const {
    isOnline,
    pendingEvents,
    pendingStarts,
    pendingEnds,
    queueEvent,
    clearQueue,
    lastError,
  } = useSyncContext();
  const { token, user } = useAuthContext();
  const [site, setSite] = React.useState<Site | null>(null);
  const [isMarkingArrival, setMarkingArrival] = React.useState(false);
  const [arrivalRecorded, setArrivalRecorded] = React.useState(false);
  const [now, setNow] = React.useState<Date>(() => new Date());
  const [startPersisted, setStartPersisted] = React.useState<string | null>(null);
  const [currentId, setCurrentId] = React.useState<string | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!id || !token) {
      return;
    }
    let cancelled = false;
    // reset arrival state when changing d'intervention
    setArrivalRecorded(false);
    setMarkingArrival(false);
    setStartPersisted(null);
    setCurrentId(id);
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getInterventionById(token, id);
        if (!cancelled) {
          setIntervention(data);
          if (data?.status !== 'IN_PROGRESS') {
            AsyncStorage.removeItem(START_CACHE_KEY(id)).catch(() => {});
          }
          // Reload persisted start time if backend does not return it
          if (!data?.actualStartAt) {
            const cachedStart = await AsyncStorage.getItem(START_CACHE_KEY(id));
            if (cachedStart) {
              setStartPersisted(cachedStart);
              setIntervention((prev) =>
                prev ? { ...prev, actualStartAt: cachedStart, actualStartTime: prev.actualStartTime ?? cachedStart } : prev,
              );
            }
          }
          if (data) {
            try {
              const rawSite = await getSite(token, data.siteId);
              if (!cancelled) {
                const toNumber = (val: any) => {
                  const n = Number(val);
                  return Number.isFinite(n) ? n : undefined;
                };
                const normalizedSite: Site = {
                  ...rawSite,
                  latitude: toNumber(rawSite.latitude),
                  longitude: toNumber(rawSite.longitude),
                };
                setSite(normalizedSite);
                setIntervention((prev) =>
                  prev
                    ? {
                        ...prev,
                        siteAddress: normalizedSite.address,
                        siteLatitude: normalizedSite.latitude ?? prev.siteLatitude,
                        siteLongitude: normalizedSite.longitude ?? prev.siteLongitude,
                      }
                    : prev,
                );
              }
            } catch {
              // ignore
            }
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const goBack = React.useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const isPlanned = intervention?.status === 'PLANNED';
  const isRunning = intervention?.status === 'IN_PROGRESS';
  const isCompleted = intervention?.status === 'COMPLETED';
  const userAttendance = React.useMemo(
    () => intervention?.agents?.find((a) => a.id === user?.id) ?? null,
    [intervention?.agents, user?.id],
  );
  const hasStarted = Boolean(userAttendance?.checkInTime);

  React.useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, currentId]);

  const startDate = React.useMemo(() => {
    if (!intervention) {
      return null;
    }
    if (intervention.actualStartAt) {
      return new Date(intervention.actualStartAt);
    }
    if (startPersisted) {
      const d = new Date(startPersisted);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return getActualDate(intervention);
  }, [intervention?.actualStartAt, intervention?.actualStartTime, intervention?.date, startPersisted]);

  const plannedStart = React.useMemo(() => {
    if (!intervention?.date || !intervention?.startTime) return null;
    return buildDateTime(intervention.date, intervention.startTime);
  }, [intervention?.date, intervention?.startTime]);
  const plannedEnd = React.useMemo(() => {
    if (!intervention?.date || !intervention?.endTime) return null;
    return buildDateTime(intervention.date, intervention.endTime);
  }, [intervention?.date, intervention?.endTime]);

  const arrivalAllowedFrom = React.useMemo(() => {
    if (!plannedStart) return null;
    return new Date(plannedStart.getTime() - 30 * 60 * 1000);
  }, [plannedStart]);

  const canMarkArrival = React.useMemo(() => {
    if (arrivalRecorded) return true;
    if (!arrivalAllowedFrom) return true;
    return now >= arrivalAllowedFrom;
  }, [arrivalAllowedFrom, arrivalRecorded, now]);

  const hasPendingSync = intervention
    ? pendingEvents.some((event: { interventionId: string }) => event.interventionId === intervention.id)
    : false;

  const actualStartDisplay = React.useMemo(() => {
    if (intervention?.actualStartTime) return intervention.actualStartTime;
    if (userAttendance?.checkInTime) return formatTime(new Date(userAttendance.checkInTime));
    return null;
  }, [intervention?.actualStartTime, userAttendance?.checkInTime]);

  const actualEndDisplay = React.useMemo(() => {
    if (intervention?.actualEndTime) return intervention.actualEndTime;
    if (userAttendance?.checkOutTime) return formatTime(new Date(userAttendance.checkOutTime));
    return null;
  }, [intervention?.actualEndTime, userAttendance?.checkOutTime]);

  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const runWithProximityCheck = React.useCallback(
    async (onSuccess: () => Promise<void> | void) => {
      if (!intervention) {
        return;
      }
      if (typeof site?.latitude !== 'number' || typeof site?.longitude !== 'number') {
        onSuccess();
        return;
      }
      setIsVerifying(true);
      const result = await verifyProximityToSite(site.latitude, site.longitude, 120);
      setIsVerifying(false);
      if (result.ok) {
        await onSuccess();
        return;
      }
      const distanceInfo =
        typeof result.distance === 'number' ? `\nDistance estimée : ${Math.round(result.distance)} m.` : '';
      Alert.alert(
        'Position à confirmer',
        `${result.message ?? 'Vous semblez trop loin du site.'}${distanceInfo}`,
        [
          { text: 'Réessayer', style: 'cancel' },
          { text: 'Continuer', style: 'default', onPress: () => { onSuccess(); } },
        ],
      );
    },
    [intervention, site],
  );

  const handleStart = React.useCallback(() => {
    const target = intervention;
    if (!target || !token || !user) {
      return;
    }
    if (!arrivalRecorded) {
      Alert.alert('Arrivée requise', 'Enregistrez d’abord votre présence sur site.');
      return;
    }
    const startAction = async () => {
      const coords = await getCurrentCoordinates().catch(() => null);
      const now = new Date();
      if (!coords) {
        Alert.alert('Position requise', 'Impossible de récupérer votre position pour démarrer.');
        return;
      }
      if (isOnline) {
        try {
          await checkIn(token, {
            userId: user.id,
            siteId: target.siteId,
            latitude: coords.latitude,
            longitude: coords.longitude,
            interventionId: target.id,
          });
        } catch (err: any) {
          Alert.alert('Démarrage hors ligne', "Impossible de contacter le serveur, l'action sera synchronisée plus tard.");
          // on file en offline
          queueEvent({
            userId: user.id,
            interventionId: target.id,
            siteId: target.siteId,
            type: 'START',
            timestamp: now.toISOString(),
            coordinates: coords,
          });
        }
      } else {
        queueEvent({
          userId: user.id,
          interventionId: target.id,
          siteId: target.siteId,
          type: 'START',
          timestamp: now.toISOString(),
          coordinates: coords,
        });
      }
      const displayTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setIntervention((prev) =>
        prev
          ? {
              ...prev,
              status: 'IN_PROGRESS',
              actualStartTime: prev.actualStartTime ?? displayTime,
              actualStartAt: prev.actualStartAt ?? now.toISOString(),
              agents: prev.agents.map((a) =>
                a.id === user.id
                  ? {
                      ...a,
                      attendanceStatus: 'IN_PROGRESS',
                      checkInTime: a.checkInTime ?? now.toISOString(),
                    }
                  : a,
              ),
            }
          : prev,
      );
      AsyncStorage.setItem(START_CACHE_KEY(target.id), now.toISOString()).catch(() => {});
      try {
        await updateInterventionStatus(token, target.id, 'IN_PROGRESS');
      } catch (err) {
        console.warn('Unable to sync intervention start status', err);
      }
    };
    runWithProximityCheck(startAction);
  }, [arrivalRecorded, intervention, queueEvent, runWithProximityCheck, token, user]);

  const handleFinish = React.useCallback(() => {
    const target = intervention;
    if (!target || !token || !user) {
      return;
    }
    const finishAction = async () => {
      const now = new Date();
      if (isOnline) {
        try {
          await checkOut(token, { userId: user.id, interventionId: target.id });
        } catch (err: any) {
          Alert.alert('Fin hors ligne', "Impossible de contacter le serveur, l'action sera synchronisée plus tard.");
          const coords = await getCurrentCoordinates().catch(() => null);
          queueEvent({
            userId: user.id,
            interventionId: target.id,
            siteId: target.siteId,
            type: 'END',
            timestamp: now.toISOString(),
            coordinates: coords ?? undefined,
          });
        }
      } else {
        const coords = await getCurrentCoordinates().catch(() => null);
        queueEvent({
          userId: user.id,
          interventionId: target.id,
          siteId: target.siteId,
          type: 'END',
          timestamp: now.toISOString(),
          coordinates: coords ?? undefined,
        });
      }
      const displayTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setIntervention((prev) =>
        prev
          ? {
              ...prev,
              status: 'COMPLETED',
              actualEndTime: prev.actualEndTime ?? displayTime,
              actualEndAt: prev.actualEndAt ?? now.toISOString(),
              agents: prev.agents.map((a) =>
                a.id === user.id
                  ? {
                      ...a,
                      attendanceStatus: 'COMPLETED',
                      checkOutTime: a.checkOutTime ?? now.toISOString(),
                    }
                  : a,
              ),
            }
          : prev,
      );
      AsyncStorage.removeItem(START_CACHE_KEY(target.id)).catch(() => {});
      // aligne le statut côté web (attente explicite pour éviter de rester "En cours")
      try {
        await updateInterventionStatus(token, target.id, 'COMPLETED');
      } catch (err) {
        console.warn('Unable to sync intervention status', err);
      }
      setArrivalRecorded(false);
      setStartPersisted(null);
    };
    runWithProximityCheck(finishAction);
  }, [intervention, queueEvent, runWithProximityCheck, token, user]);

  const handleProblem = React.useCallback(() => {
    setProblemModalVisible(true);
  }, []);

  const handleArrival = React.useCallback(async () => {
    if (!intervention || !token || !user) return;
    if (!canMarkArrival && arrivalAllowedFrom) {
      Alert.alert(
        'Trop tôt',
        `Vous pourrez enregistrer votre présence à partir de ${formatTime(arrivalAllowedFrom)}.`,
      );
      return;
    }
    const toNumber = (value: any) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : undefined;
    };

    // Always refresh the site from backend to get latest GPS
    let targetSite = site;
    if (!targetSite || targetSite.latitude === undefined || targetSite.longitude === undefined) {
      try {
        const fetched = await getSite(token, intervention.siteId);
        const normalized: Site = {
          ...fetched,
          latitude: toNumber(fetched.latitude),
          longitude: toNumber(fetched.longitude),
        };
        targetSite = normalized;
        setSite(normalized);
        setIntervention((prev) =>
          prev
            ? {
                ...prev,
                siteAddress: normalized.address ?? prev.siteAddress,
                siteLatitude: normalized.latitude ?? prev.siteLatitude,
                siteLongitude: normalized.longitude ?? prev.siteLongitude,
              }
            : prev,
        );
      } catch (error: any) {
        Alert.alert(
          'Coordonnées manquantes',
          "Impossible de récupérer les coordonnées GPS du site. Réessayez plus tard.",
        );
        return;
      }
    }

    const targetLat = toNumber(targetSite?.latitude) ?? toNumber(intervention.siteLatitude);
    const targetLon = toNumber(targetSite?.longitude) ?? toNumber(intervention.siteLongitude);

    if (typeof targetLat !== 'number' || typeof targetLon !== 'number') {
      Alert.alert(
        'Coordonnées manquantes',
        'Coordonnées GPS introuvables pour ce site. Enregistrement de présence impossible.',
      );
      return;
    }

    setMarkingArrival(true);
    try {
      const coords = await getCurrentCoordinates();
      if (isOnline) {
        await markArrival(token, {
          userId: user.id,
          siteId: intervention.siteId,
          latitude: coords.latitude,
          longitude: coords.longitude,
          interventionId: intervention.id,
        });
        Alert.alert('Présence enregistrée', 'Votre arrivée sur site a été enregistrée.');
      } else {
        queueEvent({
          userId: user.id,
          interventionId: intervention.id,
          siteId: intervention.siteId,
          type: 'ARRIVAL',
          timestamp: new Date().toISOString(),
          coordinates: coords,
        });
        Alert.alert('Présence enregistrée hors ligne', 'Elle sera synchronisée dès le retour réseau.');
      }
      setArrivalRecorded(true);
    } catch (error: any) {
      if (!isOnline) {
        Alert.alert("Impossible d’enregistrer la présence", error?.message ?? 'Erreur inconnue');
      } else {
        // fallback offline
        const coords = await getCurrentCoordinates().catch(() => null);
        if (coords) {
          queueEvent({
            userId: user.id,
            interventionId: intervention.id,
            siteId: intervention.siteId,
            type: 'ARRIVAL',
            timestamp: new Date().toISOString(),
            coordinates: coords,
          });
          Alert.alert('Présence enregistrée hors ligne', 'Elle sera synchronisée dès le retour réseau.');
          setArrivalRecorded(true);
        } else {
          Alert.alert("Impossible d’enregistrer la présence", error?.message ?? 'Erreur inconnue');
        }
      }
    } finally {
      setMarkingArrival(false);
    }
  }, [arrivalAllowedFrom, canMarkArrival, intervention, token, user, site, isOnline, queueEvent]);

  const openMaps = React.useCallback(() => {
    if (!site) {
      return;
    }
    const query = encodeURIComponent(`${site.name} ${site.address}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  }, [site]);

  // Heartbeat interval to keep backend updated while running
  React.useEffect(() => {
    if (!token || !user || !intervention || intervention.status !== 'IN_PROGRESS') return;
    let cancelled = false;
    const sendBeat = async () => {
      try {
        const coords = await getCurrentCoordinates().catch(() => null);
        if (!coords) return;
        await heartbeat(token, {
          userId: user.id,
          siteId: intervention.siteId,
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      } catch {
        // silent
      }
    };
    sendBeat();
    const interval = setInterval(() => {
      if (cancelled) return;
      sendBeat();
    }, 5 * 60 * 1000); // toutes les 5 minutes
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, user, intervention]);

  if (isLoading) {
    return (
      <HeaderLayout title="Intervention" subtitle="Chargement en cours" accent="Planning">
        <ActivityIndicator color={theme.colors.primary} />
      </HeaderLayout>
    );
  }

  if (!intervention) {
    return (
      <HeaderLayout title="Intervention" subtitle="Introuvable" accent="Planning">
        <Text style={styles.empty}>Impossible de trouver cette intervention.</Text>
        <Button title="Retour" onPress={goBack} />
      </HeaderLayout>
    );
  }

  return (
    <HeaderLayout
      title={intervention.siteName}
      subtitle={`${TYPE_LABELS[intervention.type]} • ${STATUS_LABELS[intervention.status]}`}
      accent="Détail intervention"
      trailing={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          {isMarkingArrival && <ActivityIndicator color={theme.colors.primary} />}
          {!(isCompleted || userAttendance?.attendanceStatus === 'COMPLETED') && (
            <Button
              title={
                isMarkingArrival
                  ? 'Enregistrement...'
                  : arrivalRecorded
                  ? 'Présence enregistrée'
                  : 'Enregistrer ma présence'
              }
              onPress={handleArrival}
              disabled={
                isMarkingArrival ||
                isVerifying ||
                arrivalRecorded ||
                !canMarkArrival ||
                userAttendance?.attendanceStatus === 'COMPLETED'
              }
            />
          )}
        </View>
      }
    >
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
            },
          ],
        }}
      >
        <ScrollView
          style={styles.sectionStack}
          contentContainerStyle={{ gap: theme.spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
        {hasPendingSync && (
          <View style={styles.syncBanner}>
            <Text style={styles.syncBannerTitle}>Intervention en attente de synchronisation</Text>
            <Text style={styles.syncBannerText}>
              {isOnline
                ? 'Synchronisation en cours…'
                : 'Hors connexion, envoi dès le retour réseau.'}
            </Text>
            <Text style={styles.syncBannerText}>
              Événements en attente : {pendingEvents.length} (Arrivée/Début/Fin)
            </Text>
            {pendingEvents.slice(0, 5).map((evt) => (
              <Text key={evt.id} style={styles.syncBannerText}>
                • {evt.type} {evt.timestamp?.slice(11, 16)} — {evt.status ?? 'pending'}
                {evt.status === 'failed' && evt.error ? ` (${evt.error})` : ''}
              </Text>
            ))}
            {lastError && <Text style={[styles.syncBannerText, { color: '#c62828' }]}>Dernière erreur : {lastError}</Text>}
            {pendingEvents.length > 5 && (
              <Text style={styles.syncBannerText}>… {pendingEvents.length - 5} élément(s) supplémentaires</Text>
            )}
            {pendingEvents.length > 0 && (
              <Button title="Purger la file locale" variant="ghost" onPress={clearQueue} />
            )}
          </View>
        )}

        <RunningTimer isRunning={isRunning} startDate={startDate} plannedStart={plannedStart} plannedEnd={plannedEnd} />

        <Section title="Type d’intervention">
          <Text style={styles.highlight}>{TYPE_LABELS[intervention.type]}</Text>
          {intervention.type === 'PUNCTUAL' && intervention.subType && (
            <Text style={styles.textMuted}>{intervention.subType}</Text>
          )}
        </Section>

        <Section title="Site">
          <Text style={styles.highlight}>{site?.name ?? intervention.siteName}</Text>
          {site?.address && <Text style={styles.textMuted}>{site.address}</Text>}
          <Button title="Ouvrir dans Maps" variant="ghost" onPress={openMaps} />
        </Section>

        <Section title="Horaires">
          <Text style={styles.row}>
            Prévu : {intervention.startTime} → {intervention.endTime}
          </Text>
          {arrivalAllowedFrom && (
            <Text style={styles.textMuted}>
              Arrivée possible dès {formatTime(arrivalAllowedFrom)} (30 min avant le début)
            </Text>
          )}
          {actualStartDisplay && (
            <Text style={styles.row}>
              Réel début : <Text style={styles.highlight}>{actualStartDisplay}</Text>
            </Text>
          )}
          {actualEndDisplay && (
            <Text style={styles.row}>
              Réel fin : <Text style={styles.highlight}>{actualEndDisplay}</Text>
            </Text>
          )}
        </Section>

        <Section title="Agents assignés">
          <AssignedAgentsList agents={intervention.agents} currentUserId={user?.id} />
        </Section>

        {intervention.type === 'PUNCTUAL' && (
          <Section title="Camions mobilisés">
            {intervention.truckLabels?.length ? (
              intervention.truckLabels.map((truck) => (
                <Text key={truck} style={styles.row}>
                  • {truck}
                </Text>
              ))
            ) : (
              <Text style={styles.textMuted}>Pas de camion affecté.</Text>
            )}
          </Section>
        )}

        {intervention.observation && (
          <Section title="Observation">
            <Text style={styles.row}>{intervention.observation}</Text>
          </Section>
        )}

        {isRunning && (
          <Section title="Checklist">
            <Text style={styles.textMuted}>
              Checklist à venir. Veillez à suivre les consignes partagées par votre équipe.
            </Text>
          </Section>
        )}
        </ScrollView>
      </Animated.View>

      <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
        {!arrivalRecorded && !canMarkArrival && arrivalAllowedFrom && (
          <Text style={styles.textMuted}>
            Arrivée possible dès {formatTime(arrivalAllowedFrom)} (30 min avant le début).
          </Text>
        )}
        {isVerifying && (
          <View style={styles.verifyingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.verifyingText}>Vérification de la position…</Text>
          </View>
        )}
        {isMarkingArrival && (
          <View style={styles.verifyingRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.verifyingText}>Enregistrement de présence...</Text>
          </View>
        )}
        {!isCompleted && !hasStarted && (
          <Button
            title="Démarrer l’intervention"
            onPress={handleStart}
            disabled={isVerifying || !arrivalRecorded}
          />
        )}
        {!isCompleted && hasStarted && !(userAttendance?.attendanceStatus === 'COMPLETED') && (
          <Button title="Terminer l’intervention" onPress={handleFinish} disabled={isVerifying} />
        )}
        <Button title="Signaler un problème" variant="ghost" onPress={handleProblem} />
      </Animated.View>
      <ProblemModal
        visible={isProblemModalVisible}
        onClose={() => setProblemModalVisible(false)}
        type={problemType}
        onTypeChange={setProblemType}
        description={problemDescription}
        onDescriptionChange={setProblemDescription}
        photos={problemPhotos}
        onAddPhoto={async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
            Alert.alert('Permission requise', 'Activez la caméra pour joindre une photo.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.5,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets?.length) {
            setProblemPhotos((prev) => [...prev, result.assets[0].uri]);
          }
        }}
        onRemovePhoto={(uri) =>
          setProblemPhotos((prev) => prev.filter((photo) => photo !== uri))
        }
        onSubmit={async () => {
          if (!intervention) {
            return;
          }
          if (!problemDescription.trim()) {
            Alert.alert('Description requise', 'Veuillez décrire le problème rencontré.');
            return;
          }
          setSubmittingProblem(true);
          try {
            if (!token) {
              throw new Error('Session expirée');
            }
            // Convertit les photos locales en base64 pour les transmettre à l'API
            const photosBase64 = await Promise.all(
              problemPhotos.map(async (uri) => {
                try {
                  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                  return `data:image/jpeg;base64,${base64}`;
                } catch (e) {
                  return null;
                }
              }),
            );
            const cleanedPhotos = photosBase64.filter((v): v is string => Boolean(v));

            await createAnomaly(token, {
              interventionId: intervention.id,
              type: problemType,
              description: problemDescription.trim(),
              photos: cleanedPhotos,
            });
            Alert.alert('Merci', 'Votre anomalie a été transmise à l’équipe.');
            setIntervention((prev) => (prev ? { ...prev, status: 'NEEDS_REVIEW' } : prev));
            setProblemDescription('');
            setProblemPhotos([]);
            setProblemType('CLEANLINESS');
            setProblemModalVisible(false);
          } catch (error) {
            Alert.alert('Erreur', "Impossible d'envoyer l'anomalie.");
          } finally {
            setSubmittingProblem(false);
          }
        }}
        submitting={isSubmittingProblem}
      />
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  sectionStack: {
    flex: 1,
  },
  highlight: {
    fontFamily: theme.fonts.bodySemiBold,
    color: theme.colors.ink,
  },
  textMuted: {
    color: theme.colors.muted,
  },
  row: {
    color: theme.colors.ink,
  },
  empty: {
    color: theme.colors.muted,
  },
  actions: {
    gap: theme.spacing.md,
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  verifyingText: {
    color: theme.colors.muted,
  },
  syncBanner: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    gap: 4,
  },
  syncBannerTitle: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.primary,
  },
  syncBannerText: {
    color: theme.colors.muted,
  },
});
