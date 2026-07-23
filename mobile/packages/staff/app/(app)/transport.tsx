import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { mobileStaff, type TransportVehicle } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Screen } from '../../src/components/Screen';
import { colors, spacing } from '../../src/theme';

export default function TransportScreen() {
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await mobileStaff.transportVehicles();
      setVehicles(res.vehicles);
      if (!selectedId && res.vehicles[0]) setSelectedId(res.vehicles[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  async function pingLocation() {
    if (!selectedId) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location access is required for GPS tracking.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await mobileStaff.transportLocation({
      vehicleId: selectedId,
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      speedKmh: loc.coords.speed ? loc.coords.speed * 3.6 : 0,
      heading: loc.coords.heading ?? 0,
    });
  }

  async function toggleTracking() {
    if (tracking) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setTracking(false);
      return;
    }
    setTracking(true);
    await pingLocation();
    intervalRef.current = setInterval(() => {
      void pingLocation().catch(() => undefined);
    }, 30000);
  }

  async function emergency() {
    if (!selectedId) return;
    try {
      const loc = await Location.getCurrentPositionAsync().catch(() => null);
      await mobileStaff.transportEmergency({
        vehicleId: selectedId,
        description: 'Emergency assistance requested',
        latitude: loc?.coords.latitude,
        longitude: loc?.coords.longitude,
      });
      Alert.alert('Sent', 'Emergency alert sent to principal.');
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not send emergency');
    }
  }

  return (
    <Screen loading={loading} error={error} onRefresh={load}>
      {vehicles.length === 0 ? (
        <EmptyState title="No vehicles" message="Ask admin to register transport vehicles." />
      ) : null}

      {vehicles.map((v) => (
        <Pressable key={v.id} onPress={() => setSelectedId(v.id)}>
          <Card>
            <Text style={[styles.vehicle, selectedId === v.id && styles.selected]}>
              {v.vehicleNumber} · {v.routeName}
            </Text>
            <Text style={styles.meta}>Driver: {v.driverName}</Text>
            {v.latestLocation ? (
              <Text style={styles.meta}>
                Last ping: {new Date(v.latestLocation.recordedAt).toLocaleTimeString()}
              </Text>
            ) : (
              <Text style={styles.meta}>No location yet</Text>
            )}
          </Card>
        </Pressable>
      ))}

      {vehicles.length > 0 ? (
        <View style={styles.actions}>
          <Pressable style={styles.trackBtn} onPress={toggleTracking}>
            <Text style={styles.btnText}>{tracking ? 'Stop tracking' : 'Start GPS (30s)'}</Text>
          </Pressable>
          <Pressable style={styles.emergencyBtn} onPress={emergency}>
            <Text style={styles.btnText}>Emergency</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  vehicle: { fontSize: 17, fontWeight: '700', color: colors.text },
  selected: { color: colors.primary },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  trackBtn: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  emergencyBtn: { backgroundColor: colors.danger, borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
