import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'erp_mobile_token';
const STUDENT_KEY = 'erp_active_student_id';

export async function loadToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token: string | null) {
  if (!token) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function loadActiveStudentId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STUDENT_KEY);
  } catch {
    return null;
  }
}

export async function saveActiveStudentId(studentId: string | null) {
  if (!studentId) {
    await SecureStore.deleteItemAsync(STUDENT_KEY);
    return;
  }
  await SecureStore.setItemAsync(STUDENT_KEY, studentId);
}
