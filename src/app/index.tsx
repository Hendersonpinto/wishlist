import {
  addItem,
  ConflictError,
  CURRENT_USER,
  getItems,
  reserveItem,
  unreserveItem,
  WishItem,
} from "@/api";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type SortOption = "price-low" | "price-high";
type ReservationFilter = "all" | "unreserved" | "mine" | "others";
const MAX_PRICE_DKK = 2500;
const palette = {
  primary: "#1f4470",
  primarySoft: "#eaf1f8",
  primaryBorder: "#b9d5f4",
  secondary: "#f0f1f2",
  disabled: "#e1e3e5",
  disabledText: "#79828b",
} as const;

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
  const [sortOption, setSortOption] = useState<SortOption>("price-low");
  const [reservationFilter, setReservationFilter] = useState<ReservationFilter>("all");
  const [draftReservationFilter, setDraftReservationFilter] = useState<ReservationFilter>("all");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE_DKK);
  const [draftMinPrice, setDraftMinPrice] = useState(0);
  const [draftMaxPrice, setDraftMaxPrice] = useState(MAX_PRICE_DKK);
  const [activeSheet, setActiveSheet] = useState<"sort" | "filter">("filter");
  const [isOptionsSheetVisible, setIsOptionsSheetVisible] = useState(false);
  const hasActiveFilters = reservationFilter !== "all" || minPrice > 0 || maxPrice < MAX_PRICE_DKK;

  const visibleItems = useMemo(() => {
    let result = items.filter((item) => {
      if (reservationFilter === "unreserved" && item.reservedBy !== null) return false;
      if (reservationFilter === "mine" && item.reservedBy !== CURRENT_USER) return false;
      if (reservationFilter === "others" && (!item.reservedBy || item.reservedBy === CURRENT_USER)) return false;
      if (item.priceMinor < minPrice * 100) return false;
      if (maxPrice < MAX_PRICE_DKK && item.priceMinor > maxPrice * 100) return false;
      return true;
    });

    if (sortOption === "price-low") {
      result = [...result].sort((a, b) => a.priceMinor - b.priceMinor);
    } else {
      result = [...result].sort((a, b) => b.priceMinor - a.priceMinor);
    }

    return result;
  }, [items, reservationFilter, minPrice, maxPrice, sortOption]);

  function openFilterSheet() {
    setDraftReservationFilter(reservationFilter);
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
    setActiveSheet("filter");
    setIsOptionsSheetVisible(true);
  }

  function openSortSheet() {
    setActiveSheet("sort");
    setIsOptionsSheetVisible(true);
  }

  function closeOptionsSheet() {
    setIsOptionsSheetVisible(false);
  }

  function applyFilter() {
    setReservationFilter(draftReservationFilter);
    setMinPrice(draftMinPrice);
    setMaxPrice(draftMaxPrice);
    closeOptionsSheet();
  }

  function resetFilters() {
    setDraftReservationFilter("all");
    setDraftMinPrice(0);
    setDraftMaxPrice(MAX_PRICE_DKK);
    setReservationFilter("all");
    setMinPrice(0);
    setMaxPrice(MAX_PRICE_DKK);
  }

  function clearFilters() {
    resetFilters();
    closeOptionsSheet();
  }

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
      <View style={styles.wishlistHeader}>
        <Image
          source={require("../../assets/images/wishlist-header.png")}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.wishlistHeaderShade} />
        <View style={styles.wishlistIdentity}>
          <View accessibilityLabel="Henderson's avatar" style={styles.wishlistAvatar}>
            <Text style={styles.wishlistAvatarInitial}>H</Text>
          </View>
          <Text style={styles.wishlistTitle}>Henderson's Birthday</Text>
        </View>
        <Text style={styles.wishlistDate}>29th September 2026</Text>
        <Text style={styles.wishlistDescription}>
          Need some inspo for my birthday? Here you are!
        </Text>
      </View>
      <BlurView intensity={36} tint="light" style={styles.contentSheet}>
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: reservationFilter === "unreserved" }}
            onPress={() => setReservationFilter((filter) => filter === "unreserved" ? "all" : "unreserved")}
            style={styles.togglePressable}
          >
            <BlurView intensity={36} tint="light" style={styles.unreservedToggle}>
              <View style={[styles.toggleTrack, reservationFilter === "unreserved" && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, reservationFilter === "unreserved" && styles.toggleThumbActive]} />
              </View>
              <Text style={styles.controlLabel}>Unreserved only</Text>
            </BlurView>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose sorting"
            onPress={openSortSheet}
            style={styles.controlPressable}
          >
            <BlurView intensity={36} tint="light" style={styles.controlButton}>
              <Text style={styles.controlIcon}>↕</Text>
              <Text style={styles.controlLabel}>Sort</Text>
            </BlurView>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose filters"
            onPress={openFilterSheet}
            style={styles.controlPressable}
          >
            <BlurView
              intensity={36}
              tint="light"
              style={[
                styles.controlButton,
                (reservationFilter !== "all" || minPrice > 0 || maxPrice < MAX_PRICE_DKK) && styles.controlActive,
              ]}
            >
              <Text style={styles.controlIcon}>☷</Text>
              <Text style={styles.controlLabel}>Filter</Text>
            </BlurView>
          </Pressable>
        </View>
      <FlatList
        numColumns={2}
        columnWrapperStyle={styles.cardRow}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={visibleItems}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.statusText}>
            {items.length === 0 ? "No items yet." : "No items match these filters."}
          </Text>
        }
        ListFooterComponent={hasActiveFilters ? (
          <Pressable accessibilityRole="button" onPress={resetFilters} style={styles.clearFiltersLink}>
            <Text style={styles.clearFiltersLinkText}>Clear all filters</Text>
          </Pressable>
        ) : null}
        renderItem={({ item }) => (
          <BlurView intensity={32} tint="light" style={styles.item}>
            <View style={styles.productImageStage}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} contentFit="cover" transition={180} style={styles.productImage} />
              ) : (
                <View style={styles.productPlaceholder}>
                  <SymbolView name={getItemSymbol(item.title)} size={50} tintColor="#776956" />
                </View>
              )}
            </View>
            <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>
              {(item.priceMinor / 100).toLocaleString("da-DK", {
                maximumFractionDigits: 0,
                minimumFractionDigits: 0,
              })} kr.
            </Text>
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
                <ActivityIndicator color={item.reservedBy && item.reservedBy !== CURRENT_USER ? "#7b8288" : "white"} />
              ) : (
                <View style={styles.reserveButtonText}>
                  <Text
                    style={[
                      styles.reserveLabel,
                      item.reservedBy && item.reservedBy !== CURRENT_USER && styles.reserveLabelDisabled,
                      item.reservedBy === CURRENT_USER && styles.ownedReservationLabel,
                    ]}
                  >
                    {item.reservedBy === CURRENT_USER
                      ? "✓  Reserved by you"
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
          </BlurView>
        )}
      />
      </BlurView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add wishlist item"
        onPress={() => setIsAddModalVisible(true)}
        style={({ pressed }) => [styles.addBar, pressed && styles.fabPressed]}
      >
        <BlurView pointerEvents="none" intensity={48} tint="light" style={styles.addBarGlass} />
        <Text style={styles.addBarLabel}>＋ Add item</Text>
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
          >
            <BlurView pointerEvents="none" intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.backdropShade} />
          </Pressable>
          <BlurView intensity={70} tint="light" style={styles.sheet}>
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
          </BlurView>
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
          >
            <BlurView pointerEvents="none" intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.backdropShade} />
          </Pressable>
          <BlurView intensity={70} tint="light" style={styles.conflictSheet}>
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
                  <SymbolView
                    name={{ ios: "gift", android: "redeem", web: "redeem" }}
                    size={24}
                    tintColor="#776956"
                  />
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
          </BlurView>
        </View>
      </Modal>

      <Modal
        visible={isOptionsSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeOptionsSheet}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Close options"
            onPress={closeOptionsSheet}
            style={styles.backdrop}
          >
            <BlurView pointerEvents="none" intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.backdropShade} />
          </Pressable>
          <BlurView intensity={70} tint="light" style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {activeSheet === "sort" ? "Sort items" : "Filter items"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={closeOptionsSheet}
                hitSlop={12}
              >
                <Text style={styles.closeLabel}>✕</Text>
              </Pressable>
            </View>
            {activeSheet === "sort" ? (
              <>
                <OptionRow
                  label="Price: low to high"
                  selected={sortOption === "price-low"}
                  onPress={() => { setSortOption("price-low"); closeOptionsSheet(); }}
                />
                <OptionRow
                  label="Price: high to low"
                  selected={sortOption === "price-high"}
                  onPress={() => { setSortOption("price-high"); closeOptionsSheet(); }}
                />
              </>
            ) : (
              <>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.statusOptions}>
                  <StatusOption label="All items" icon="●" selected={draftReservationFilter === "all"} onPress={() => setDraftReservationFilter("all")} />
                  <StatusOption label="Unreserved only" icon="◉" selected={draftReservationFilter === "unreserved"} onPress={() => setDraftReservationFilter("unreserved")} />
                  <StatusOption label="Reserved by me" icon="♙" selected={draftReservationFilter === "mine"} onPress={() => setDraftReservationFilter("mine")} />
                  <StatusOption label="Reserved by others" icon="♙♙" selected={draftReservationFilter === "others"} onPress={() => setDraftReservationFilter("others")} />
                </View>

                <View style={styles.priceHeading}>
                  <Text style={styles.filterSectionTitle}>Price range</Text>
                  <Text style={styles.priceSelection}>
                    {draftMinPrice.toLocaleString("da-DK")}–{draftMaxPrice.toLocaleString("da-DK")}{draftMaxPrice === MAX_PRICE_DKK ? "+" : ""} kr.
                  </Text>
                </View>
                <PriceRangeSlider
                  min={draftMinPrice}
                  max={draftMaxPrice}
                  onChangeMin={setDraftMinPrice}
                  onChangeMax={setDraftMaxPrice}
                />
                <View style={styles.rangeLabels}>
                  <Text style={styles.rangeLabel}>0 kr.</Text>
                  <Text style={styles.rangeLabel}>{MAX_PRICE_DKK.toLocaleString("da-DK")}+ kr.</Text>
                </View>
                <View style={styles.pricePresets}>
                  <RangePreset label="Any price" active={draftMinPrice === 0 && draftMaxPrice === MAX_PRICE_DKK} onPress={() => { setDraftMinPrice(0); setDraftMaxPrice(MAX_PRICE_DKK); }} />
                  <RangePreset label="Under 500 kr." active={draftMinPrice === 0 && draftMaxPrice === 500} onPress={() => { setDraftMinPrice(0); setDraftMaxPrice(500); }} />
                  <RangePreset label="500–1,000 kr." active={draftMinPrice === 500 && draftMaxPrice === 1000} onPress={() => { setDraftMinPrice(500); setDraftMaxPrice(1000); }} />
                  <RangePreset label="Over 1,000 kr." active={draftMinPrice === 1000 && draftMaxPrice === MAX_PRICE_DKK} onPress={() => { setDraftMinPrice(1000); setDraftMaxPrice(MAX_PRICE_DKK); }} />
                </View>
                <View style={styles.filterActions}>
                  <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearButton}>
                    <Text style={styles.clearLabel}>Clear all</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={applyFilter} style={styles.applyButton}>
                    <Text style={styles.submitLabel}>Apply</Text>
                  </Pressable>
                </View>
              </>
            )}
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

function OptionRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={styles.optionRow}
    >
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}


function StatusOption({ label, icon, selected, onPress }: { label: string; icon: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={styles.statusOption}>
      <View style={styles.statusIcon}><Text style={styles.statusIconText}>{icon}</Text></View>
      <Text style={styles.statusOptionLabel}>{label}</Text>
      <View style={[styles.statusCheck, selected && styles.statusCheckSelected]}>
        {selected ? <Text style={styles.statusCheckMark}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

function RangePreset({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.rangePreset, active && styles.rangePresetActive]}>
      <Text style={[styles.rangePresetLabel, active && styles.rangePresetLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function getItemSymbol(title: string) {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes("coffee") || normalizedTitle.includes("espresso") || normalizedTitle.includes("pour-over")) {
    return { ios: "cup.and.saucer.fill", android: "coffee", web: "coffee" } as const;
  }
  if (normalizedTitle.includes("blanket") || normalizedTitle.includes("wool")) {
    return { ios: "bed.double.fill", android: "bed", web: "bed" } as const;
  }
  if (normalizedTitle.includes("headphone")) {
    return { ios: "headphones", android: "headphones", web: "headphones" } as const;
  }
  if (normalizedTitle.includes("pan") || normalizedTitle.includes("cast iron")) {
    return { ios: "fork.knife", android: "restaurant", web: "restaurant" } as const;
  }
  if (normalizedTitle.includes("lamp")) {
    return { ios: "lightbulb.fill", android: "lightbulb", web: "lightbulb" } as const;
  }
  if (normalizedTitle.includes("lego") || normalizedTitle.includes("architecture")) {
    return { ios: "building.2.fill", android: "account_balance", web: "account_balance" } as const;
  }
  if (normalizedTitle.includes("shoe") || normalizedTitle.includes("nike")) {
    return { ios: "figure.walk", android: "directions_walk", web: "directions_walk" } as const;
  }
  if (normalizedTitle.includes("kindle") || normalizedTitle.includes("paperwhite") || normalizedTitle.includes("book")) {
    return { ios: "book.closed.fill", android: "menu_book", web: "menu_book" } as const;
  }
  return { ios: "gift", android: "redeem", web: "redeem" } as const;
}

function PriceRangeSlider({ min, max, onChangeMin, onChangeMax }: {
  min: number;
  max: number;
  onChangeMin: (value: number) => void;
  onChangeMax: (value: number) => void;
}) {
  const trackRef = useRef<View>(null);
  const trackWidth = useRef(1);
  const trackLeft = useRef(0);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const activeThumb = useRef<"min" | "max">("min");
  minRef.current = min;
  maxRef.current = max;

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event, gesture) => {
      trackRef.current?.measureInWindow((x, _y, width) => {
        trackLeft.current = x;
        trackWidth.current = Math.max(width, 1);
        const localX = gesture.x0 - x;
        const minX = minRef.current / MAX_PRICE_DKK * width;
        const maxX = maxRef.current / MAX_PRICE_DKK * width;
        activeThumb.current = Math.abs(localX - minX) <= Math.abs(localX - maxX) ? "min" : "max";
        updateValue(localX);
      });
    },
    onPanResponderMove: (_event, gesture) => updateValue(gesture.moveX - trackLeft.current),
  // The refs track current values; these callbacks remain stable for the gesture responder.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  function updateValue(localX: number) {
    const value = Math.max(0, Math.min(MAX_PRICE_DKK, Math.round(localX / trackWidth.current * MAX_PRICE_DKK / 50) * 50));
    if (activeThumb.current === "min") {
      onChangeMin(Math.min(value, maxRef.current));
    } else {
      onChangeMax(Math.max(value, minRef.current));
    }
  }

  return (
    <View style={styles.sliderTouchArea} {...responder.panHandlers}>
      <View
        ref={trackRef}
        onLayout={(event) => { trackWidth.current = event.nativeEvent.layout.width; }}
        style={styles.sliderTrack}
      >
        <View style={[styles.sliderSelection, { left: `${min / MAX_PRICE_DKK * 100}%`, right: `${100 - max / MAX_PRICE_DKK * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${min / MAX_PRICE_DKK * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${max / MAX_PRICE_DKK * 100}%` }]} />
      </View>
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
    backgroundColor: "#eee6dd",
  },
  statusText: {
    color: "#555",
    fontSize: 16,
    textAlign: "center",
  },
  wishlistHeader: {
    minHeight: 250,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 60,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  wishlistHeaderShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(20,15,11,0.28)",
  },
  wishlistIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 7,
  },
  wishlistAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  wishlistAvatarInitial: {
    color: "white",
    fontSize: 19,
    fontWeight: "700",
  },
  wishlistTitle: {
    flex: 1,
    color: "white",
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  wishlistDate: {
    color: "white",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  wishlistDescription: {
    color: "white",
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  contentSheet: {
    flex: 1,
    marginTop: -40,
    paddingTop: 22,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    backgroundColor: "rgba(255,255,255,0.24)",
    overflow: "hidden",
  },
  controls: {
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
    marginBottom: 12,
  },
  unreservedToggle: {
    flex: 1,
    minHeight: 36,
    borderRadius: 20,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    overflow: "hidden",
  },
  controlPressable: {
    borderRadius: 20,
    overflow: "hidden",
  },
  togglePressable: {
    flex: 1,
    minWidth: 0,
    borderRadius: 20,
    overflow: "hidden",
  },
  toggleTrack: {
    width: 26,
    height: 16,
    borderRadius: 8,
    padding: 2,
    justifyContent: "center",
    backgroundColor: "#d6d9dc",
  },
  toggleTrackActive: {
    backgroundColor: palette.primary,
  },
  toggleThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "white",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  controlButton: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  controlActive: {
    borderColor: "rgba(31,68,112,0.78)",
  },
  controlLabel: {
    color: "#30363b",
    fontSize: 12,
    fontWeight: "600",
  },
  activeControlLabel: {
    color: palette.primary,
  },
  controlIcon: {
    color: "#30363b",
    fontSize: 15,
    fontWeight: "700",
  },
  list: {
    flex: 1,
    backgroundColor: "transparent",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 94,
    gap: 10,
  },
  clearFiltersLink: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  clearFiltersLinkText: {
    color: palette.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  cardRow: {
    gap: 10,
  },
  item: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
    padding: 8,
    gap: 3,
    flexBasis: "48.5%",
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    overflow: "hidden",
    shadowColor: "#614d3e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 3,
  },
  productImageStage: {
    height: 102,
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#eee7df",
    marginBottom: 3,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eee5dc",
  },
  title: {
    minHeight: 30,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
    color: "#1e242a",
  },
  price: {
    color: "#252b31",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
    marginBottom: 3,
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
    minHeight: 31,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginBottom: 1,
  },
  reserveButtonDisabled: {
    borderColor: palette.disabled,
    backgroundColor: palette.disabled,
  },
  reserveLabel: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  reserveLabelDisabled: {
    color: palette.disabledText,
  },
  reserveButtonText: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  ownedReservationButton: {
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "#ffffff",
  },
  ownedReservationLabel: {
    color: palette.primary,
  },
  unreserveHint: {
    color: "#58718c",
    fontSize: 9,
  },
  addBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 22,
    height: 46,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#55483d",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
  },
  addBarGlass: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  fabPressed: {
    opacity: 0.82,
  },
  addBarLabel: {
    color: "#4d555b",
    fontSize: 14,
    fontWeight: "600",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "transparent",
  },
  backdropShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(14, 22, 30, 0.18)",
  },
  sheet: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 9,
    overflow: "hidden",
  },
  optionRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e7e7e7",
  },
  optionLabel: {
    color: "#292d31",
    fontSize: 16,
  },
  filterSectionTitle: {
    color: "#25292d",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 2,
  },
  statusOptions: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 14,
    paddingHorizontal: 10,
    overflow: "hidden",
  },
  statusOption: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#dedede",
  },
  statusIcon: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: "#e5e9ed",
    alignItems: "center",
    justifyContent: "center",
  },
  statusIconText: {
    color: "#56616a",
    fontSize: 11,
    fontWeight: "700",
  },
  statusOptionLabel: {
    flex: 1,
    color: "#343a40",
    fontSize: 14,
  },
  statusCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#b8bec4",
    alignItems: "center",
    justifyContent: "center",
  },
  statusCheckSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  statusCheckMark: {
    color: "white",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
  },
  priceHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  priceSelection: {
    color: "#525d67",
    fontSize: 12,
  },
  sliderTouchArea: {
    height: 32,
    justifyContent: "center",
    marginHorizontal: 10,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cfd4d8",
    justifyContent: "center",
  },
  sliderSelection: {
    position: "absolute",
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.primary,
  },
  sliderThumb: {
    position: "absolute",
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 9,
    backgroundColor: palette.primary,
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 2,
    elevation: 2,
  },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 4,
    marginTop: -6,
  },
  rangeLabel: {
    color: "#68737d",
    fontSize: 11,
  },
  pricePresets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 3,
  },
  rangePreset: {
    flexGrow: 1,
    minHeight: 38,
    minWidth: "46%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#f1f2f3",
    borderWidth: 1,
    borderColor: "#e5e7e8",
    paddingHorizontal: 10,
  },
  rangePresetActive: {
    backgroundColor: palette.primarySoft,
    borderColor: palette.primaryBorder,
  },
  rangePresetLabel: {
    color: "#4e5962",
    fontSize: 12,
  },
  rangePresetLabelActive: {
    color: palette.primary,
    fontWeight: "600",
  },
  filterActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  clearButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: palette.secondary,
  },
  clearLabel: {
    color: "#30363b",
    fontSize: 15,
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: palette.primary,
  },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#a9afb5",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: palette.primary,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: palette.primary,
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
    backgroundColor: palette.primary,
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
    backgroundColor: "rgba(255,250,247,0.22)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
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
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
});
