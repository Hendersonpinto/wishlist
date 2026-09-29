export type WishItem = { 
 id: string; 
 title: string; 
 priceMinor: number; // cent 
 currency: "DKK"; 
 url?: string; 
 imageUrl?: string; 
 reservedBy: string | null; 
};

export class ConflictError extends Error { 
 constructor(public item: WishItem) { 
 super("Item was already reserved"); 
 this.name = "ConflictError"; 
 } 
} 

export class NotFoundError extends Error { 
 constructor() { 
 super("Item not found"); 
 this.name = "NotFoundError"; 
 } 
} 

export const CURRENT_USER = "you";

let items: WishItem[] = [ 
 { id: "1", title: "Ceramic pour-over set", priceMinor: 44900, currency: "DKK", url: "https://example.com/1", reservedBy: null }, 
 { id: "2", title: "Wool blanket, dark green", priceMinor: 89900, currency: "DKK", reservedBy: null }, 
 { id: "3", title: "Noise-cancelling headphones", priceMinor: 249900, currency: "DKK", reservedBy: "mette" }, 
 { id: "4", title: "Cast iron pan, 26cm", priceMinor: 59900, currency: "DKK", reservedBy: null }, 
 { id: "5", title: "Danish design lamp", priceMinor: 129900, currency: "DKK", reservedBy: null }, 
 { id: "6", title: "Espresso beans, 1kg subscription", priceMinor: 34900, currency: "DKK", reservedBy: null }, 
]; 
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)); const latency = () => 200 + Math.random() * 600;

const flaky = (rate = 0.1) => Math.random() < rate; 
export async function getItems(): Promise<WishItem[]> { 
 await sleep(latency()); 
 if (flaky()) throw new Error("Network error"); 
 return items.map((i) => ({ ...i })); 
} 

export async function addItem( 
 input: Pick<WishItem, "title" | "priceMinor" | "url"> 
): Promise<WishItem> { 
 await sleep(latency()); 
 if (flaky(0.05)) throw new Error("Network error"); 
 const item: WishItem = { 
 id: crypto.randomUUID(), 
 currency: "DKK", 
 reservedBy: null, 
 ...input, 
 }; 
 items = [...items, item]; 
 return { ...item }; 
} 

export async function reserveItem(id: string, userId = CURRENT_USER): Promise<WishItem> { 
 await sleep(latency()); 
 const item = items.find((i) => i.id === id); 
 if (!item) throw new NotFoundError(); 
 if (item.reservedBy && item.reservedBy !== userId) throw new ConflictError({ ...item }); 
 item.reservedBy = userId; 
 return { ...item }; 
} 

export async function unreserveItem(id: string, userId = CURRENT_USER): Promise<WishItem> { 
 await sleep(latency()); 
 const item = items.find((i) => i.id === id); 
 if (!item) throw new NotFoundError(); 
 if (item.reservedBy !== userId) throw new ConflictError({ ...item });  item.reservedBy = null; 
 return { ...item }; 
} 

// Other people are using this wishlist too. They reserve and change their minds, 
// but they never touch anything CURRENT_USER has reserved.
const OTHERS = ["mette", "jonas", "farmor"];

const sample = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]; 

function ghostTick() { 
 const pool = items.filter((i) => i.reservedBy !== CURRENT_USER);  const free = pool.filter((i) => !i.reservedBy); 
 const held = pool.filter((i) => i.reservedBy); 
 // Keep at least half the reachable items free, so the list never dead-ends.  

if (free.length <= pool.length / 2 && held.length) { 
 sample(held).reservedBy = null; 
 } else if (free.length) { 
 sample(free).reservedBy = sample(OTHERS); 
 } 
 setTimeout(ghostTick, 8000 + Math.random() * 7000); 
} 
setTimeout(ghostTick, 10000);
