import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { mobileStaff } from '@360schoolerp/shared';
import { Card } from '../../src/components/Card';
import { Screen } from '../../src/components/Screen';
import { colors, radius, spacing } from '../../src/theme';

export default function DiaryScreen() {
  const [className, setClassName] = useState('Class 1');
  const [sectionName, setSectionName] = useState('A');
  const [subjectName, setSubjectName] = useState('Mathematics');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function publish() {
    if (!title.trim()) return Alert.alert('Title required', 'Enter a homework title.');
    setSubmitting(true);
    try {
      await mobileStaff.createHomework({
        className,
        sectionName,
        subjectName,
        title: title.trim(),
        description,
        dueDate: dueDate || undefined,
        share: true,
      });
      Alert.alert('Published', 'Daily diary entry shared with students and parents.');
      setTitle('');
      setDescription('');
      setDueDate('');
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not publish diary');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.heading}>Create daily diary</Text>
      <Card>
        <Field label="Class" value={className} onChangeText={setClassName} />
        <Field label="Section" value={sectionName} onChangeText={setSectionName} />
        <Field label="Subject" value={subjectName} onChangeText={setSubjectName} />
        <Field label="Title" value={title} onChangeText={setTitle} />
        <Field label="Description" value={description} onChangeText={setDescription} multiline />
        <Field label="Due date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} />
        <Pressable style={styles.btn} onPress={publish} disabled={submitting}>
          <Text style={styles.btnText}>{submitting ? 'Publishing…' : 'Publish to class'}</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
      />
    </>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 18, fontWeight: '700', marginBottom: spacing.md, color: colors.text },
  label: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, backgroundColor: '#fafafa' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: spacing.md },
  btnText: { color: '#fff', fontWeight: '700' },
});
