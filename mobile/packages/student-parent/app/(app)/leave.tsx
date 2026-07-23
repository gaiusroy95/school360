import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { mobileApp, uploadFileUrl, type LeaveApplication } from '@360schoolerp/shared';
import { ChildHeader } from '../../src/components/ChildHeader';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { useStudentParams } from '../../src/context/StudentContext';
import { colors, radius, spacing } from '../../src/theme';

export default function LeaveScreen() {
  const params = useStudentParams();
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [leaveType, setLeaveType] = useState('Medical');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await mobileApp.leave(params);
      setApplications(res.applications);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leave applications');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pickAttachment() {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const upload = await mobileApp.upload({
      fileName: asset.name,
      mimeType: asset.mimeType || 'application/octet-stream',
      dataBase64: base64,
      studentId: params.studentId,
    });

    setAttachmentUrl(upload.upload.url);
    setAttachmentName(asset.name);
  }

  async function submit() {
    if (!fromDate || !toDate || reason.trim().length < 3) {
      Alert.alert('Missing fields', 'Please enter dates and a reason (min 3 characters).');
      return;
    }

    setSubmitting(true);
    try {
      await mobileApp.submitLeave({
        ...params,
        leaveType,
        fromDate,
        toDate,
        reason: reason.trim(),
        attachmentUrl: attachmentUrl || undefined,
      });
      setFromDate('');
      setToDate('');
      setReason('');
      setAttachmentUrl(null);
      setAttachmentName(null);
      Alert.alert('Submitted', 'Leave application sent to school for review.');
      void load();
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not submit leave');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Leave', headerShown: true }} />
      <Screen loading={loading} error={error} onRefresh={load}>
        <ChildHeader />

        <Text style={styles.section}>New application</Text>
        <Card>
          <Text style={styles.label}>Leave type</Text>
          <TextInput style={styles.input} value={leaveType} onChangeText={setLeaveType} />

          <Text style={styles.label}>From (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={fromDate} onChangeText={setFromDate} placeholder="2026-07-22" />

          <Text style={styles.label}>To (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={toDate} onChangeText={setToDate} placeholder="2026-07-23" />

          <Text style={styles.label}>Reason</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
          />

          <Pressable style={styles.attachBtn} onPress={pickAttachment}>
            <Text style={styles.attachText}>
              {attachmentName ? `Attached: ${attachmentName}` : 'Attach medical certificate (optional)'}
            </Text>
          </Pressable>

          <Pressable style={styles.submitBtn} onPress={submit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit application</Text>
            )}
          </Pressable>
        </Card>

        <Text style={styles.section}>Previous applications</Text>
        {applications.map((app) => (
          <Card key={app.id}>
            <Text style={styles.appTitle}>{app.leaveType}</Text>
            <Text style={styles.appMeta}>
              {app.fromDate} → {app.toDate} · {app.status}
            </Text>
            <Text style={styles.appReason}>{app.reason}</Text>
            {app.attachmentUrl ? (
              <Text style={styles.link}>Attachment on file</Text>
            ) : null}
          </Card>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  attachBtn: { marginTop: spacing.md, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8 },
  attachText: { color: colors.primary, fontWeight: '600' },
  submitBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '700' },
  appTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  appMeta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  appReason: { fontSize: 14, color: colors.text, marginTop: 8 },
  link: { fontSize: 13, color: colors.primary, marginTop: 6 },
});
