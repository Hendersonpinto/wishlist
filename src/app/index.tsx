import { addItem, getItems, WishItem } from "@/api";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Index() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [url, setUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadItems() {
      try {
        const itemsResponse = await getItems();
        setItems(itemsResponse);
      } catch (error) {
        console.error("Could not load items:", error);
        setError("Could not load items. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadItems();
  }, []);

  async function handleAddItem() {
    const parsedPrice = Number(price.replace(",", "."));
    if (!title.trim()) {
      setFormError("Enter an item name.");
      return;
    }
    if (!price.trim() || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError("Enter a valid price.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const newItem = await addItem({
        title: title.trim(),
        priceMinor: Math.round(parsedPrice * 100),
        ...(url.trim() ? { url: url.trim() } : {}),
      });
      setItems((currentItems) => [...currentItems, newItem]);
      setTitle("");
      setPrice("");
      setUrl("");
      setIsAddModalVisible(false);
    } catch (error) {
      console.error("Could not add item:", error);
      setFormError("Could not add the item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" accessibilityLabel="Loading wishlist items" />
        <Text style={styles.statusText}>Loading items…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.statusText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.statusText}>No items yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>
              {(item.priceMinor / 100).toLocaleString("da-DK", {
                style: "currency",
                currency: item.currency,
              })}
            </Text>
            {item.reservedBy ? (
              <Text style={styles.reserved}>Reserved</Text>
            ) : (
              <Text style={styles.available}>Available</Text>
            )}
          </View>
        )}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add wishlist item"
        onPress={() => setIsAddModalVisible(true)}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>

      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable
            accessibilityLabel="Close add item form"
            onPress={() => setIsAddModalVisible(false)}
            style={styles.backdrop}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add an item</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setIsAddModalVisible(false)}
                hitSlop={12}
              >
                <Text style={styles.closeLabel}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What would you like?"
              style={styles.input}
              returnKeyType="next"
              accessibilityLabel="Item name"
            />

            <Text style={styles.inputLabel}>Price (DKK)</Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              style={styles.input}
              keyboardType="decimal-pad"
              accessibilityLabel="Price in Danish kroner"
            />

            <Text style={styles.inputLabel}>Link (optional)</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://…"
              style={styles.input}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Item link"
            />

            {formError ? <Text style={styles.formError}>{formError}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={handleAddItem}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !isSaving && styles.submitButtonPressed,
                isSaving && styles.submitButtonDisabled,
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitLabel}>Add to wishlist</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  screen: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },
  statusText: {
    color: "#555",
    fontSize: 16,
    textAlign: "center",
  },
  list: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  item: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  price: {
    color: "#444",
    fontSize: 15,
  },
  available: {
    color: "#24734a",
    fontSize: 14,
  },
  reserved: {
    color: "#8a5b00",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#24734a",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
  },
  fabPressed: {
    opacity: 0.82,
  },
  fabLabel: {
    color: "white",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "400",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 9,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d4d4d4",
    marginBottom: 5,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1d2c24",
  },
  closeLabel: {
    fontSize: 20,
    color: "#666",
    padding: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#343434",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#d8ddd9",
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 16,
    color: "#222",
    backgroundColor: "#fff",
  },
  formError: {
    color: "#b42318",
    fontSize: 14,
  },
  submitButton: {
    minHeight: 50,
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: "#24734a",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
