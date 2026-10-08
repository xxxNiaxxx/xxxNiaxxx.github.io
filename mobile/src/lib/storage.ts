import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** SecureStore on iOS/Android (Keychain/Keystore); localStorage for the web preview. */
export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === "web") return globalThis.localStorage?.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (Platform.OS === "web") return globalThis.localStorage?.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};
