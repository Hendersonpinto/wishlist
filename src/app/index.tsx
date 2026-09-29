import {
  addItem,
  ConflictError,
  CURRENT_USER,
  getItems,
  reserveItem,
  unreserveItem,
  WishItem,
} from "@/api";
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
  const [reservingItemIds, setReservingItemIds] = useState<Set<string>>(() => new Set());
  const [conflictItem, setConflictItem] = useState<WishItem | null>(null);
  const [reserveError, setReserveError] = useState<{ id: string; message: string } | null>(null);

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
      setFormError("Enter a valid pric.");
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

  async function handleReservationToggle(item: WishItem) {
    setReservingItemIds((currentIds) => new Set(currentIds).add(item.id));
    setReserveError(null);
    try {
      const updatedItem =
        item.reservedBy === CURRENT_USER
          ? await unreserveItem(item.id)
          : await reserveItem(item.id);
      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === updatedItem.id ? updatedItem : currentItem,
        ),
      );
    } catch (error) {
      if (error instanceof ConflictError) {
        setItems((currentItems) =>
          currentItems.map((currentItem) =>
            currentItem.id === error.item.id ? error.item : currentItem,
          ),
        );
        setConflictItem(error.item);
      } else {
        console.error("Could not reserve item:", error);
        setReserveError({ id: item.id, message: "Could not reserve. Please try again." });
      }
    } finally {
      setReservingItemIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(item.id);
        return nextIds;
      });
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
              <Text style={styles.reserved}>
                {item.reservedBy === CURRENT_USER ? "Reserved by you" : "Reserved"}
              </Text>
            ) : (
              <Text style={styles.available}>Available</Text>
            )}
            {reserveError?.id === item.id ? (
              <Text style={styles.formError}>{reserveError.message}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                item.reservedBy === CURRENT_USER
                  ? `Unreserve ${item.title}`
                  : item.reservedBy
                    ? "Item already reserved"
                    : `Reserve ${item.title}`
              }
              accessibilityState={{
                disabled: (Boolean(item.reservedBy) && item.reservedBy !== CURRENT_USER) || reservingItemIds.has(item.id),
              }}
              disabled={(Boolean(item.reservedBy) && item.reservedBy !== CURRENT_USER) || reservingItemIds.has(item.id)}
              onPress={() => handleReservationToggle(item)}
              style={({ pressed }) => [
                styles.reserveButton,
                ((Boolean(item.reservedBy) && item.reservedBy !== CURRENT_USER) || reservingItemIds.has(item.id)) && styles.reserveButtonDisabled,
                item.reservedBy === CURRENT_USER && styles.ownedReservationButton,
                pressed && (!item.reservedBy || item.reservedBy === CURRENT_USER) && styles.submitButtonPressed,
              ]}
            >
              {reservingItemIds.has(item.id) ? (
                <ActivityIndicator color="#24734a" />
              ) : (
                <View style={styles.reserveButtonText}>
                  <Text
                    style={[
                      styles.reserveLabel,
                      item.reservedBy && item.reservedBy !== CURRENT_USER && styles.reserveLabelDisabled,
                    ]}
                  >
                    {item.reservedBy === CURRENT_USER
                      ? "Reserved by you"
                      : item.reservedBy
                        ? "Reserved"
                        : "Reserve"}
                  </Text>
                  {item.reservedBy === CURRENT_USER ? (
                    <Text style={styles.unreserveHint}>Tap to unreserve</Text>
                  ) : null}
                </View>
              )}
            </Pressable>
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

      <Modal
        visible={conflictItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setConflictItem(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close reservation notice"
            onPress={() => setConflictItem(null)}
            style={styles.backdrop}
          />
          <View style={styles.conflictSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.conflictIcon}>
              <Text style={styles.conflictIconLabel}>♙</Text>
            </View>
            <Text style={styles.conflictTitle}>Someone else just reserved this gift</Text>
            <Text style={styles.conflictDescription}>
              This item is no longer available. Try another gift from the list.
            </Text>
            {conflictItem ? (
              <View style={styles.conflictItem}>
                <View style={styles.conflictItemImage}>
                  <Text style={styles.conflictItemEmoji}>🎁</Text>
                </View>
                <View style={styles.conflictItemInfo}>
                  <Text numberOfLines={1} style={styles.conflictItemTitle}>
                    {conflictItem.title}
                  </Text>
                  <Text style={styles.conflictItemPrice}>
                    {(conflictItem.priceMinor / 100).toLocaleString("da-DK", {
                      style: "currency",
                      currency: conflictItem.currency,
                    })}
                  </Text>
                </View>
                <Text style={styles.conflictBadge}>Reserved</Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => setConflictItem(null)}
              style={({ pressed }) => [styles.conflictButton, pressed && styles.submitButtonPressed]}
            >
              <Text style={styles.submitLabel}>View updated list</Text>
            </Pressable>
          </View>
        </View>
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
  reserveButton: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#24734a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  reserveButtonDisabled: {
    borderColor: "#d7dce0",
    backgroundColor: "#f0f2f4",
  },
  reserveLabel: {
    color: "#24734a",
    fontSize: 15,
    fontWeight: "700",
  },
  reserveLabelDisabled: {
    color: "#7b8288",
  },
  reserveButtonText: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  ownedReservationButton: {
    borderColor: "#b7d8c5",
    backgroundColor: "#eef7f1",
  },
  unreserveHint: {
    color: "#527563",
    fontSize: 11,
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
  conflictSheet: {
    backgroundColor: "#fffaf7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
    alignItems: "center",
    gap: 12,
  },
  conflictIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: 4,
    backgroundColor: "#ffe4e0",
    alignItems: "center",
    justifyContent: "center",
  },
  conflictIconLabel: {
    color: "#e94840",
    fontSize: 27,
  },
  conflictTitle: {
    color: "#20242a",
    fontSize: 17,
    lineHeight: 23,
    textAlign: "center",
    fontWeight: "700",
  },
  conflictDescription: {
    color: "#687078",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: -6,
  },
  conflictItem: {
    width: "100%",
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 13,
    backgroundColor: "#f1eee9",
    padding: 8,
    marginTop: 3,
  },
  conflictItemImage: {
    width: 46,
    height: 46,
    borderRadius: 9,
    backgroundColor: "#ded8ce",
    alignItems: "center",
    justifyContent: "center",
  },
  conflictItemEmoji: {
    fontSize: 24,
  },
  conflictItemInfo: {
    flex: 1,
    gap: 3,
  },
  conflictItemTitle: {
    color: "#292d31",
    fontSize: 13,
    fontWeight: "600",
  },
  conflictItemPrice: {
    color: "#292d31",
    fontSize: 12,
  },
  conflictBadge: {
    overflow: "hidden",
    borderRadius: 9,
    backgroundColor: "#e1e6eb",
    color: "#57616b",
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
  },
  conflictButton: {
    width: "100%",
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: "#347ff0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
});
