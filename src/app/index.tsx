import { WishItem, getItems } from "@/api";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

export default function Index() {

  const [items, setItems] = useState<WishItem[]>([])
  const [errorLoadingItems, setErrorLoadingItems] = useState<null | string>(null)
  const [isLoadingItems, setIsLoadingItems] = useState(true)




  useEffect(()=>{
    const fetchItems = async ()=> {
    try {
      const itemsResponse = await getItems()
      setItems(itemsResponse)
      setIsLoadingItems(false)
    }
    catch(error){
      console.error("Could not load items:", error);
      setErrorLoadingItems("Could not load items. Please try again.");
    }finally {
      setIsLoadingItems(false)

    }
    }
    fetchItems()

  },[])


  if (isLoadingItems) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" accessibilityLabel="Loading wishlist items" />
        <Text style={styles.statusText}>Loading items…</Text>
      </View>
    );
  }


  if (errorLoadingItems) {
    return (
      <View style={styles.centered}>
        <Text style={styles.statusText}>{errorLoadingItems}</Text>
      </View>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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



}});
