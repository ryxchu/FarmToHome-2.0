import { collection, addDoc, getDocs, query, where, updateDoc, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export const cleanupDuplicates = async () => {
  const productsRef = collection(db, 'products');
  const snapshot = await getDocs(productsRef);
  
  const productsByName: Record<string, any[]> = {};
  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const name = data.name;
    if (!productsByName[name]) productsByName[name] = [];
    productsByName[name].push({ id: docSnap.id, ...data });
  });

  for (const name in productsByName) {
    const docs = productsByName[name];
    if (docs.length > 1) {
      // Sort by updatedAt descending (if exists) or just keep the first
      docs.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });

      // Keep the first (newest), delete others
      const toDelete = docs.slice(1);
      for (const item of toDelete) {
        await deleteDoc(doc(db, 'products', item.id));
        console.log(`Deleted duplicate product: ${item.name} (${item.id})`);
      }
    }
  }
};

export const seedProducts = async (farmerId: string = 'demo-farmer') => {
  const productsRef = collection(db, 'products');
  
  // Quick count check
  const snapshot = await getDocs(productsRef);
  if (snapshot.size > 15) return; 

  const extraProducts = [
    {
      name: 'Organic Dragon Fruit',
      description: 'Vibrant pink skin with sweet, speckled white flesh. Rich in antioxidants and freshly picked from our tropical orchard.',
      price: 150,
      category: 'Fruits',
      stock: 45,
      unit: 'kg',
      images: ['https://images.unsplash.com/photo-1527325241048-2161b36350d5?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 4.8,
      reviews: 12,
      isPublished: true
    },
    {
      name: 'Heirloom Cherry Tomatoes',
      description: 'A mix of rainbow cherry tomatoes, bursting with flavor. Grown without synthetic pesticides.',
      price: 85,
      category: 'Vegetables',
      stock: 30,
      unit: 'basket',
      images: ['https://images.unsplash.com/photo-1592841200221-a689cd7379ba?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 4.9,
      reviews: 24,
      isPublished: true
    },
    {
      name: 'Purple Sweet Potato',
      description: 'Nutrient-dense root crops with a beautiful purple hue. Perfect for roasting or making traditional desserts.',
      price: 60,
      category: 'Root Crops',
      stock: 100,
      unit: 'kg',
      images: ['https://images.unsplash.com/photo-1596003906949-67221c37965c?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 4.7,
      reviews: 15,
      isPublished: true
    },
    {
      name: 'Fresh Lemongrass',
      description: 'Aromatic stalks perfect for tea, soups, and flavoring. Harvested every morning.',
      price: 30,
      category: 'Herbs & Spices',
      stock: 50,
      unit: 'bundle',
      images: ['https://images.unsplash.com/photo-1571166645353-832386121f1d?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 5.0,
      reviews: 8,
      isPublished: true
    },
    {
      name: 'Upland Red Rice',
      description: 'Traditional organic red rice. High in fiber and nutty in flavor. No chemical polishing.',
      price: 95,
      category: 'Grains',
      stock: 200,
      unit: 'kg',
      images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 4.8,
      reviews: 19,
      isPublished: true
    },
    {
      name: 'Carabao Mango',
      description: 'Known as the sweetest mango in the world. Freshly picked from our orchard.',
      price: 180,
      category: 'Fruits',
      stock: 50,
      unit: 'kg',
      images: ['https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 5.0,
      reviews: 42,
      isPublished: true
    },
    {
      name: 'Hydroponic Lettuce',
      description: 'Crisp, clean, and soil-free. Grown using mineral-rich water solutions for maximum nutrient density.',
      price: 120,
      category: 'Vegetables',
      stock: 60,
      unit: 'head',
      images: ['https://images.unsplash.com/photo-1622206187812-7013fc992984?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 4.9,
      reviews: 14,
      isPublished: true
    },
    {
      name: 'Purple Eggplant',
      description: 'Shiny, firm purple eggplants. Perfect for grilling or traditional stews.',
      price: 70,
      category: 'Vegetables',
      stock: 40,
      unit: 'kg',
      images: ['https://images.unsplash.com/photo-1635843104323-95c52f64b4b0?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 4.6,
      reviews: 18,
      isPublished: true
    },
    {
      name: 'Organic Turmeric Root',
      description: 'Golden, anti-inflammatory powerhouse. Freshly dug from the volcanic soil of the highlands.',
      price: 200,
      category: 'Herbs & Spices',
      stock: 25,
      unit: 'kg',
      images: ['https://images.unsplash.com/photo-1615485500704-8e990fdd9044?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 4.7,
      reviews: 9,
      isPublished: true
    },
    {
      name: 'Fresh Native Garlic',
      description: 'Small but incredibly aromatic and flavorful cloves. Harvested and cured properly.',
      price: 220,
      category: 'Herbs & Spices',
      stock: 15,
      unit: 'kg',
      images: ['https://images.unsplash.com/photo-1540148426945-6cf9241566cf?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 4.9,
      reviews: 28,
      isPublished: true
    },
    {
      name: 'Native Yellow Corn',
      description: 'Sweet and starchy yellow corn. Great for boiling or as livestock feed.',
      price: 35,
      category: 'Grains',
      stock: 500,
      unit: 'kg',
      images: ['https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 4.6,
      reviews: 12,
      isPublished: true
    },
    {
      name: 'Highland Taro',
      description: 'Starchy root crops with a creamy texture when cooked. Ideal for savory or sweet dishes.',
      price: 80,
      category: 'Root Crops',
      stock: 120,
      unit: 'kg',
      images: ['https://images.unsplash.com/photo-1518977676601-b53f02ac6d31?auto=format&fit=crop&q=80&w=800'],
      farmerId,
      harvestDate: new Date().toISOString(),
      status: 'available',
      rating: 4.7,
      reviews: 15,
      isPublished: true
    }
  ];

  // Map existing to avoid duplicates by name
  const existingNames = new Set(snapshot.docs.map(d => d.data().name));

  for (const productData of extraProducts) {
    // Use a deterministic ID based on the name to prevent duplicates even if setDoc is called multiple times
    const productId = productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const docRef = doc(productsRef, productId);
    
    const product = {
      ...productData,
      id: productId,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, product);
  }
};
