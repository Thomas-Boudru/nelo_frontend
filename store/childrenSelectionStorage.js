import * as SecureStore from "expo-secure-store";

const SELECTED_CHILD_ID_KEY = "nelo_selected_child_id";

export async function saveSelectedChildId(childId) {
  await SecureStore.setItemAsync(SELECTED_CHILD_ID_KEY, childId);
}

export async function getSelectedChildId() {
  return SecureStore.getItemAsync(SELECTED_CHILD_ID_KEY);
}

export async function removeSelectedChildId() {
  await SecureStore.deleteItemAsync(SELECTED_CHILD_ID_KEY);
}
