const API = 'http://localhost:3001'

// Image mapping: product ID → image URL
const imageUpdates: Record<string, string> = {
  // Carboxymethylcellulose Sodium Eye Drops IP 0.5% w/v (Drug Code: 341)
  'cmrfjh9to007erhjff7cx8dc6': '/products/carboxymethylcellulose-eye-drops-0.5.jpg',
  
  // Sitagliptin Phosphate 50mg & Metformin Hydrochloride 500mg Tablets (Drug Code: 1802)
  'cmrfjhcfv00u1rhjfqepamrn0': '/products/sitagliptin-metformin-50-500.jpg',
  
  // Amlodipine 5mg and Atenolol 50mg Tablets IP (Drug Code: 263)
  'cmrfjh9nm005orhjfve5mahmo': '/products/amlodipine-atenolol-5-50.jpg',
  
  // Isosorbide Mononitrate Tablets IP 20mg (Drug Code: 923)
  'cmrfjhaza00h6rhjflrb8yquo': '/products/isosorbide-mononitrate-20mg.jpg',
  
  // Bisoprolol Fumarate Tablets 2.5 mg (Drug Code: 1531)
  'cmrfjhbpg00okrhjf4mdq2r3g': '/products/bisoprolol-fumarate-2.5mg.jpg',
  
  // Janaushadhi Poshan (Malt based food with Cocoa, 500gm) (Drug Code: 1471)
  'cmrfjhbkd00n5rhjfxrj63w51': '/products/poshan-malt-cocoa.jpg',
  
  // Nebivolol Tablets IP 5 mg (Drug Code: 421)
  'cmrfjh9xv008trhjfwtvfof2j': '/products/nebivolol-5mg.jpg',
  
  // L-Arginine Granules 3g (Drug Code: 1455)
  'cmrfjhbje00mtrhjfru0lms2c': '/products/l-arginine-granules-3g.jpg',
}

async function addWheyProtein() {
  console.log('Adding Jan Aushadhi Whey Protein Concentrate...')
  const res = await fetch(`${API}/api/medicines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sku: 'JA-WHEY-1KG',
      name: 'Jan Aushadhi 100% Whey Protein Concentrate',
      genericName: 'Whey Protein Concentrate',
      slug: 'whey-protein-concentrate-1kg',
      composition: 'Whey Protein Concentrate, Whey Protein Isolate, Whey Protein Hydrolysate with Digestive Enzymes',
      manufacturer: 'Jan Aushadhi (PMBI)',
      categoryId: 'cmrf7jmtl0008pkjf9ill04ux', // Vitamins & Supplements
      packSize: '1 kg',
      mrp: 1399,
      sellingPrice: 1199,
      gst: 12,
      discount: 14,
      stockQuantity: 100,
      minimumStockLevel: 10,
      description: 'Jan Aushadhi 100% Whey Protein Concentrate - 24g protein per serving, zero added sugars. For better recovery & muscle building. Nutraceutical for adults.',
      dosageInfo: 'Mix 1 scoop (30g) with 200ml water or milk. Shake well. Use once or twice daily.',
      benefits: '24g protein per serve, zero added sugars, contains digestive enzymes for better absorption. Supports muscle recovery and building.',
      sideEffects: 'Consult physician if lactose intolerant.',
      prescriptionRequired: false,
      expiryDate: '2027-12-31T00:00:00.000Z',
      imageUrl: '/products/whey-protein-concentrate.webp',
      isActive: true,
      isFeatured: true,
    }),
  })
  const data = await res.json()
  if (data.ok || data.id) {
    console.log(`  ✅ Added: ${data.name || data.id} (ID: ${data.id})`)
    return data.id
  } else {
    console.log(`  ❌ Failed: ${JSON.stringify(data)}`)
    return null
  }
}

async function updateImage(id: string, imageUrl: string) {
  const res = await fetch(`${API}/api/medicines/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  })
  const data = await res.json()
  if (data.ok || data.id) {
    console.log(`  ✅ Updated ${id} → ${imageUrl}`)
  } else {
    console.log(`  ❌ Failed ${id}: ${JSON.stringify(data)}`)
  }
}

async function main() {
  // Add Whey Protein first
  const wheyId = await addWheyProtein()
  if (wheyId) {
    imageUpdates[wheyId] = '/products/whey-protein-concentrate.webp'
  }

  // Update all other medicines with their images
  console.log('\nUpdating product images...')
  for (const [id, imageUrl] of Object.entries(imageUpdates)) {
    await updateImage(id, imageUrl)
  }

  console.log('\n✅ Done! All product images updated.')
}

main().catch(console.error)
