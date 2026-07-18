import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { hash } from 'bcryptjs'
import 'dotenv/config'

const adapter = new PrismaPg(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding JanAushadhi Store database...')

  // Create admin user
  const adminPassword = await hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@janaushadhi.gov.in' },
    update: {},
    create: {
      email: 'admin@janaushadhi.gov.in',
      name: 'Admin',
      phone: '9000000000',
      password: adminPassword,
      role: 'admin',
    },
  })

  // Create demo customer
  const customerPassword = await hash('customer123', 10)
  const customer = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Rahul Kumar',
      phone: '9876543210',
      password: customerPassword,
      role: 'customer',
      gender: 'Male',
    },
  })

  // Create categories
  const categories = [
    { name: 'Analgesics & Pain Relief', slug: 'analgesics', icon: '💊', description: 'Pain relief and anti-inflammatory medicines' },
    { name: 'Antibiotics', slug: 'antibiotics', icon: '🦠', description: 'Antibacterial and antimicrobial medicines' },
    { name: 'Cardiovascular', slug: 'cardiovascular', icon: '❤️', description: 'Heart and blood pressure medicines' },
    { name: 'Diabetes Care', slug: 'diabetes', icon: '💉', description: 'Blood sugar management medicines' },
    { name: 'Digestive Health', slug: 'digestive', icon: '🫁', description: 'Gastrointestinal and digestive medicines' },
    { name: 'Respiratory Care', slug: 'respiratory', icon: '🫀', description: 'Asthma, cough and cold medicines' },
    { name: 'Vitamins & Supplements', slug: 'vitamins', icon: '🌿', description: 'Nutritional supplements and multivitamins' },
    { name: 'Dermatology', slug: 'dermatology', icon: '🧴', description: 'Skin care and topical medicines' },
    { name: 'Pediatrics', slug: 'pediatrics', icon: '👶', description: 'Medicines for children' },
    { name: 'Ayurvedic & Herbal', slug: 'ayurvedic', icon: '🍃', description: 'Traditional Ayurvedic and herbal medicines' },
    { name: 'Antacids & GI', slug: 'antacids', icon: '🩺', description: 'Antacids and gastrointestinal medicines' },
    { name: 'Eye & Ear Care', slug: 'eye-ear', icon: '👁️', description: 'Ophthalmic and otic medicines' },
  ]

  const categoryMap: Record<string, string> = {}
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
    categoryMap[cat.slug] = created.id
  }

  // Create medicines
  const medicines = [
    // Analgesics
    {
      sku: 'JAN-PCM-500', name: 'Paracetamol 500mg', genericName: 'Paracetamol', slug: 'paracetamol-500mg',
      composition: 'Paracetamol IP 500mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['analgesics'],
      packSize: '10 tablets', mrp: 3.00, sellingPrice: 2.50, discount: 17, stockQuantity: 500,
      description: 'Effective pain reliever and fever reducer. Safe and affordable generic alternative.',
      dosageInfo: '1-2 tablets every 4-6 hours as needed. Max 8 tablets in 24 hours.',
      benefits: 'Relieves headache, body ache, fever, and minor pain.', sideEffects: 'Rare: nausea, allergic reactions.',
      isFeatured: true, rating: 4.5, reviewCount: 234,
    },
    {
      sku: 'JAN-IBU-400', name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', slug: 'ibuprofen-400mg',
      composition: 'Ibuprofen IP 400mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['analgesics'],
      packSize: '10 tablets', mrp: 5.50, sellingPrice: 4.00, discount: 27, stockQuantity: 350,
      description: 'Non-steroidal anti-inflammatory drug for pain, inflammation and fever.',
      dosageInfo: '1 tablet 2-3 times daily with food. Max 3 tablets daily.',
      benefits: 'Reduces pain, inflammation and fever effectively.', sideEffects: 'Stomach upset, dizziness (rare).',
      isFeatured: true, rating: 4.3, reviewCount: 189,
    },
    {
      sku: 'JAN-ACE-25', name: 'Aceclofenac 100mg + Paracetamol 325mg', genericName: 'Aceclofenac + Paracetamol', slug: 'aceclofenac-paracetamol',
      composition: 'Aceclofenac 100mg + Paracetamol 325mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['analgesics'],
      packSize: '10 tablets', mrp: 12.00, sellingPrice: 8.50, discount: 29, stockQuantity: 280,
      description: 'Combination pain reliever for moderate to severe pain.',
      dosageInfo: '1 tablet twice daily after meals.', benefits: 'Effective for joint pain, back pain, dental pain.',
      sideEffects: 'Gastric discomfort, nausea.', isFeatured: false, rating: 4.2, reviewCount: 145,
    },
    // Antibiotics
    {
      sku: 'JAN-AMX-500', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', slug: 'amoxicillin-500mg',
      composition: 'Amoxicillin Trihydrate IP 500mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['antibiotics'],
      packSize: '10 capsules', mrp: 25.00, sellingPrice: 18.00, discount: 28, stockQuantity: 200,
      description: 'Broad-spectrum antibiotic for bacterial infections.',
      dosageInfo: '1 capsule 3 times daily for 5-7 days or as directed.', benefits: 'Treats respiratory, urinary, ear infections.',
      sideEffects: 'Diarrhea, nausea, skin rash.', prescriptionRequired: true, rating: 4.4, reviewCount: 167,
    },
    {
      sku: 'JAN-AZI-500', name: 'Azithromycin 500mg', genericName: 'Azithromycin', slug: 'azithromycin-500mg',
      composition: 'Azithromycin Dihydrate IP 500mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['antibiotics'],
      packSize: '3 tablets', mrp: 28.00, sellingPrice: 20.00, discount: 29, stockQuantity: 180,
      description: 'Macrolide antibiotic for respiratory and skin infections.',
      dosageInfo: '1 tablet daily for 3 days or as directed.', benefits: 'Effective against a wide range of bacteria.',
      sideEffects: 'Nausea, diarrhea, abdominal pain.', prescriptionRequired: true, rating: 4.3, reviewCount: 134,
    },
    {
      sku: 'JAN-CIP-500', name: 'Ciprofloxacin 500mg', genericName: 'Ciprofloxacin', slug: 'ciprofloxacin-500mg',
      composition: 'Ciprofloxacin HCl IP 500mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['antibiotics'],
      packSize: '10 tablets', mrp: 35.00, sellingPrice: 24.00, discount: 31, stockQuantity: 150,
      description: 'Fluoroquinolone antibiotic for urinary tract and other infections.',
      dosageInfo: '1 tablet twice daily for 3-7 days.', benefits: 'Treats UTI, respiratory, GI infections.',
      sideEffects: 'Nausea, dizziness, photosensitivity.', prescriptionRequired: true, rating: 4.1, reviewCount: 98,
    },
    // Cardiovascular
    {
      sku: 'JAN-AML-5', name: 'Amlodipine 5mg', genericName: 'Amlodipine Besylate', slug: 'amlodipine-5mg',
      composition: 'Amlodipine Besylate IP 5mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['cardiovascular'],
      packSize: '30 tablets', mrp: 15.00, sellingPrice: 10.50, discount: 30, stockQuantity: 400,
      description: 'Calcium channel blocker for hypertension and angina.',
      dosageInfo: '1 tablet daily, same time each day.', benefits: 'Lowers blood pressure, prevents chest pain.',
      sideEffects: 'Ankle swelling, headache, flushing.', isFeatured: true, rating: 4.6, reviewCount: 312,
    },
    {
      sku: 'JAN-MET-50', name: 'Metoprolol 50mg', genericName: 'Metoprolol Succinate', slug: 'metoprolol-50mg',
      composition: 'Metoprolol Succinate ER IP 50mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['cardiovascular'],
      packSize: '30 tablets', mrp: 22.00, sellingPrice: 16.00, discount: 27, stockQuantity: 320,
      description: 'Beta-blocker for hypertension, angina, and heart failure.',
      dosageInfo: '1 tablet daily, preferably in the morning.', benefits: 'Controls heart rate and blood pressure.',
      sideEffects: 'Fatigue, dizziness, slow heartbeat.', isFeatured: false, rating: 4.4, reviewCount: 201,
    },
    {
      sku: 'JAN-LOS-50', name: 'Losartan 50mg', genericName: 'Losartan Potassium', slug: 'losartan-50mg',
      composition: 'Losartan Potassium IP 50mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['cardiovascular'],
      packSize: '30 tablets', mrp: 28.00, sellingPrice: 19.00, discount: 32, stockQuantity: 250,
      description: 'ARB for hypertension with renal protection benefits.',
      dosageInfo: '1 tablet daily, with or without food.', benefits: 'Lowers BP, protects kidneys in diabetic patients.',
      sideEffects: 'Dizziness, upper respiratory infection.', isFeatured: true, rating: 4.5, reviewCount: 178,
    },
    // Diabetes
    {
      sku: 'JAN-MET-500', name: 'Metformin 500mg', genericName: 'Metformin Hydrochloride', slug: 'metformin-500mg',
      composition: 'Metformin HCl IP 500mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['diabetes'],
      packSize: '20 tablets', mrp: 8.00, sellingPrice: 5.50, discount: 31, stockQuantity: 450,
      description: 'First-line treatment for Type 2 Diabetes.',
      dosageInfo: '1 tablet twice daily with meals. Gradual dose increase.', benefits: 'Controls blood sugar, reduces liver glucose production.',
      sideEffects: 'Nausea, diarrhea, metallic taste (initial).', isFeatured: true, rating: 4.7, reviewCount: 423,
    },
    {
      sku: 'JAN-GLIM-2', name: 'Glimepiride 2mg', genericName: 'Glimepiride', slug: 'glimepiride-2mg',
      composition: 'Glimepiride IP 2mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['diabetes'],
      packSize: '10 tablets', mrp: 18.00, sellingPrice: 12.00, discount: 33, stockQuantity: 300,
      description: 'Sulfonylurea for Type 2 Diabetes when diet alone is insufficient.',
      dosageInfo: '1 tablet daily before breakfast.', benefits: 'Stimulates insulin release from pancreas.',
      sideEffects: 'Hypoglycemia, weight gain, dizziness.', isFeatured: false, rating: 4.3, reviewCount: 156,
    },
    {
      sku: 'JAN-GLUC-025', name: 'Glucophage SR 500mg', genericName: 'Metformin Sustained Release', slug: 'glucophage-sr-500mg',
      composition: 'Metformin HCl SR IP 500mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['diabetes'],
      packSize: '20 tablets', mrp: 22.00, sellingPrice: 15.00, discount: 32, stockQuantity: 280,
      description: 'Sustained release metformin for better GI tolerance.',
      dosageInfo: '1 tablet daily with dinner. Can increase to 2 daily.', benefits: 'Better tolerability, once daily dosing.',
      sideEffects: 'Mild GI effects initially.', isFeatured: false, rating: 4.5, reviewCount: 198,
    },
    // Digestive
    {
      sku: 'JAN-PAN-40', name: 'Pantoprazole 40mg', genericName: 'Pantoprazole', slug: 'pantoprazole-40mg',
      composition: 'Pantoprazole Sodium Sesquihydrate IP 40mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['antacids'],
      packSize: '10 tablets', mrp: 20.00, sellingPrice: 14.00, discount: 30, stockQuantity: 380,
      description: 'Proton pump inhibitor for acid reflux and gastric ulcers.',
      dosageInfo: '1 tablet daily before breakfast for 2-4 weeks.', benefits: 'Reduces stomach acid, heals ulcers.',
      sideEffects: 'Headache, nausea (usually mild).', isFeatured: true, rating: 4.4, reviewCount: 267,
    },
    {
      sku: 'JAN-RAN-150', name: 'Ranitidine 150mg', genericName: 'Ranitidine', slug: 'ranitidine-150mg',
      composition: 'Ranitidine HCl IP 150mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['antacids'],
      packSize: '30 tablets', mrp: 15.00, sellingPrice: 10.00, discount: 33, stockQuantity: 350,
      description: 'H2 blocker for heartburn and acid indigestion.',
      dosageInfo: '1 tablet twice daily, morning and bedtime.', benefits: 'Reduces acid production, relieves heartburn.',
      sideEffects: 'Headache, constipation.', isFeatured: false, rating: 4.2, reviewCount: 145,
    },
    // Respiratory
    {
      sku: 'JAN-AMB-10', name: 'Montelukast 10mg', genericName: 'Montelukast Sodium', slug: 'montelukast-10mg',
      composition: 'Montelukast Sodium IP 10mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['respiratory'],
      packSize: '10 tablets', mrp: 35.00, sellingPrice: 24.00, discount: 31, stockQuantity: 200,
      description: 'Leukotriene receptor antagonist for asthma and allergic rhinitis.',
      dosageInfo: '1 tablet daily in the evening.', benefits: 'Prevents asthma attacks, reduces allergic symptoms.',
      sideEffects: 'Headache, upper respiratory infection.', isFeatured: true, rating: 4.5, reviewCount: 189,
    },
    {
      sku: 'JAN-CET-10', name: 'Cetirizine 10mg', genericName: 'Cetirizine Hydrochloride', slug: 'cetirizine-10mg',
      composition: 'Cetirizine HCl IP 10mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['respiratory'],
      packSize: '10 tablets', mrp: 6.00, sellingPrice: 4.00, discount: 33, stockQuantity: 500,
      description: 'Non-drowsy antihistamine for allergies and hay fever.',
      dosageInfo: '1 tablet once daily.', benefits: 'Relieves sneezing, runny nose, itchy eyes.',
      sideEffects: 'Mild drowsiness in some people.', isFeatured: true, rating: 4.6, reviewCount: 356,
    },
    {
      sku: 'JAN-DEX-30', name: 'Dextromethorphan + Chlorpheniramine', genericName: 'DM Cough Syrup', slug: 'dm-cough-syrup',
      composition: 'Dextromethorphan 10mg + Chlorpheniramine 4mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['respiratory'],
      packSize: '100ml syrup', mrp: 25.00, sellingPrice: 18.00, discount: 28, stockQuantity: 180,
      description: 'Combination cough suppressant and antihistamine syrup.',
      dosageInfo: 'Adults: 10ml every 6-8 hours. Children: 5ml.', benefits: 'Relieves dry cough and cold symptoms.',
      sideEffects: 'Drowsiness, dry mouth.', isFeatured: false, rating: 4.3, reviewCount: 123,
    },
    // Vitamins
    {
      sku: 'JAN-MV-ONE', name: 'Janaushadhi Multivitamin', genericName: 'Multivitamin + Multimineral', slug: 'janaushadhi-multivitamin',
      composition: 'Vit A, B-complex, C, D3, E + Zinc, Selenium', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['vitamins'],
      packSize: '30 tablets', mrp: 35.00, sellingPrice: 25.00, discount: 29, stockQuantity: 400,
      description: 'Complete daily nutrition with essential vitamins and minerals.',
      dosageInfo: '1 tablet daily after breakfast.', benefits: 'Boosts immunity, energy, and overall health.',
      sideEffects: 'Generally well tolerated.', isFeatured: true, rating: 4.4, reviewCount: 278,
    },
    {
      sku: 'JAN-VITD3', name: 'Vitamin D3 60000 IU', genericName: 'Cholecalciferol', slug: 'vitamin-d3-60000iu',
      composition: 'Cholecalciferol IP 60000 IU', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['vitamins'],
      packSize: '4 capsules', mrp: 18.00, sellingPrice: 12.00, discount: 33, stockQuantity: 350,
      description: 'High-dose Vitamin D3 for deficiency correction.',
      dosageInfo: '1 capsule weekly for 8 weeks, then monthly.', benefits: 'Stronger bones, improved calcium absorption.',
      sideEffects: 'Rare at recommended doses.', isFeatured: true, rating: 4.7, reviewCount: 345,
    },
    {
      sku: 'JAN-OM3', name: 'Omega-3 Fish Oil', genericName: 'EPA + DHA', slug: 'omega-3-fish-oil',
      composition: 'EPA 180mg + DHA 120mg per capsule', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['vitamins'],
      packSize: '30 softgel capsules', mrp: 85.00, sellingPrice: 60.00, discount: 29, stockQuantity: 200,
      description: 'Essential fatty acids for heart and brain health.',
      dosageInfo: '1-2 capsules daily with food.', benefits: 'Supports cardiovascular health, reduces triglycerides.',
      sideEffects: 'Fishy aftertaste (mild).', isFeatured: false, rating: 4.3, reviewCount: 167,
    },
    // Dermatology
    {
      sku: 'JAN-MUP-2', name: 'Mupirocin 2% Cream', genericName: 'Mupirocin', slug: 'mupirocin-2-cream',
      composition: 'Mupirocin IP 2% w/w', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['dermatology'],
      packSize: '15g tube', mrp: 32.00, sellingPrice: 22.00, discount: 31, stockQuantity: 150,
      description: 'Topical antibiotic for skin infections like impetigo.',
      dosageInfo: 'Apply thin layer to affected area 3 times daily.', benefits: 'Treats bacterial skin infections effectively.',
      sideEffects: 'Burning, stinging at application site.', isFeatured: false, rating: 4.2, reviewCount: 89,
    },
    {
      sku: 'JAN-LORE-1', name: 'Lotion for Skin Moisturizing', genericName: 'Moisturizing Lotion', slug: 'moisturizing-lotion',
      composition: 'Lotion with Aloe Vera and Vitamin E', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['dermatology'],
      packSize: '200ml', mrp: 45.00, sellingPrice: 32.00, discount: 29, stockQuantity: 220,
      description: 'Daily moisturizing lotion for dry and sensitive skin.',
      dosageInfo: 'Apply generously on clean skin as needed.', benefits: 'Hydrates and protects skin.',
      sideEffects: 'Rare allergic reactions.', isFeatured: false, rating: 4.4, reviewCount: 134,
    },
    // Ayurvedic
    {
      sku: 'JAN-CHY-1', name: 'Chyawanprash Avaleha', genericName: 'Chyawanprash', slug: 'chyawanprash',
      composition: 'Amla, Ashwagandha, Giloy, and 40+ herbs', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['ayurvedic'],
      packSize: '500g jar', mrp: 95.00, sellingPrice: 72.00, discount: 24, stockQuantity: 120,
      description: 'Traditional Ayurvedic immunity booster with natural herbs.',
      dosageInfo: '1-2 tablespoons daily, morning.', benefits: 'Boosts immunity, improves respiratory health.',
      sideEffects: 'Generally safe for all ages.', isFeatured: true, rating: 4.6, reviewCount: 289,
    },
    {
      sku: 'JAN-ASH-60', name: 'Ashwagandha 600mg', genericName: 'Ashwagandha Root Extract', slug: 'ashwagandha-600mg',
      composition: 'Withania Somnifera Extract 600mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['ayurvedic'],
      packSize: '60 tablets', mrp: 65.00, sellingPrice: 48.00, discount: 26, stockQuantity: 180,
      description: 'Adaptogenic herb for stress relief and energy.',
      dosageInfo: '1 tablet twice daily with water.', benefits: 'Reduces stress, improves energy and focus.',
      sideEffects: 'Mild stomach upset in some people.', isFeatured: false, rating: 4.5, reviewCount: 198,
    },
    // More Analgesics
    {
      sku: 'JAN-DIC-50', name: 'Diclofenac 50mg', genericName: 'Diclofenac Sodium', slug: 'diclofenac-50mg',
      composition: 'Diclofenac Sodium IP 50mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['analgesics'],
      packSize: '10 tablets', mrp: 6.00, sellingPrice: 4.00, discount: 33, stockQuantity: 300,
      description: 'NSAID for pain, swelling, and joint inflammation.',
      dosageInfo: '1 tablet 2-3 times daily after food.', benefits: 'Reduces inflammation and pain effectively.',
      sideEffects: 'Stomach upset, dizziness.', prescriptionRequired: false, rating: 4.1, reviewCount: 156,
    },
    {
      sku: 'JAN-NAP-100', name: 'Naproxen 250mg + Paracetamol', genericName: 'Naproxen + Paracetamol', slug: 'naproxen-paracetamol',
      composition: 'Naproxen Sodium 275mg + Paracetamol 300mg', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['analgesics'],
      packSize: '10 tablets', mrp: 18.00, sellingPrice: 13.00, discount: 28, stockQuantity: 200,
      description: 'Dual-action pain relief for menstrual cramps and dental pain.',
      dosageInfo: '1 tablet every 8 hours as needed.', benefits: 'Long-lasting relief from moderate pain.',
      sideEffects: 'GI discomfort, headache.', isFeatured: false, rating: 4.3, reviewCount: 112,
    },
    // Eye Care
    {
      sku: 'JAN-CFM-EYE', name: 'Ciprofloxacin Eye Drops', genericName: 'Ciprofloxacin Ophthalmic', slug: 'ciprofloxacin-eye-drops',
      composition: 'Ciprofloxacin HCl 0.3% w/v', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['eye-ear'],
      packSize: '10ml', mrp: 18.00, sellingPrice: 12.00, discount: 33, stockQuantity: 160,
      description: 'Antibiotic eye drops for bacterial conjunctivitis.',
      dosageInfo: '1-2 drops in affected eye every 2-4 hours.', benefits: 'Treats eye infections quickly.',
      sideEffects: 'Temporary burning or stinging.', prescriptionRequired: true, rating: 4.4, reviewCount: 98,
    },
    // More digestive
    {
      sku: 'JAN-ORS', name: 'ORS Sachets', genericName: 'Oral Rehydration Salts', slug: 'ors-sachets',
      composition: 'Sodium Chloride, Potassium Chloride, Sodium Citrate, Dextrose', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['digestive'],
      packSize: '20 sachets', mrp: 25.00, sellingPrice: 18.00, discount: 28, stockQuantity: 500,
      description: 'WHO-recommended ORS formula for dehydration.',
      dosageInfo: 'Dissolve 1 sachet in 1 liter water. Sip frequently.', benefits: 'Replaces lost fluids and electrolytes.',
      sideEffects: 'None when used as directed.', isFeatured: true, rating: 4.8, reviewCount: 456,
    },
    {
      sku: 'JAN-LACO-30', name: 'Lactulose 30ml', genericName: 'Lactulose Solution', slug: 'lactulose-30ml',
      composition: 'Lactulose IP 3.35g/5ml', manufacturer: 'Janaushadhi Generic', categoryId: categoryMap['digestive'],
      packSize: '30ml syrup', mrp: 22.00, sellingPrice: 16.00, discount: 27, stockQuantity: 200,
      description: 'Osmotic laxative for constipation relief.',
      dosageInfo: '15-30ml daily, preferably at bedtime.', benefits: 'Relieves constipation gently and effectively.',
      sideEffects: 'Bloating, gas initially.', isFeatured: false, rating: 4.3, reviewCount: 134,
    },
  ]

  for (const med of medicines) {
    await prisma.medicine.upsert({
      where: { slug: med.slug },
      update: {},
      create: {
        ...med,
        isActive: true,
        expiryDate: new Date('2027-12-31'),
        batchNumber: `BATCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      },
    })
  }

  // Create default address for customer
  await prisma.address.create({
    data: {
      userId: customer.id,
      name: 'Rahul Kumar',
      phone: '9876543210',
      line1: '42, MG Road',
      line2: 'Near Central Market',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      type: 'home',
      isDefault: true,
    },
  })

  // Create coupons
  const coupons = [
    { code: 'JANAUSHADHI10', description: 'Get 10% off on orders above ₹100', discount: 10, maxDiscount: 50, minOrder: 100, usageLimit: 1000 },
    { code: 'NEWUSER50', description: 'Get ₹50 off for new users', discount: 50, maxDiscount: 50, minOrder: 200, usageLimit: 500 },
    { code: 'HEALTH20', description: 'Get 20% off on vitamins & supplements', discount: 20, maxDiscount: 100, minOrder: 150, usageLimit: 300 },
    { code: 'FREESHIP', description: 'Free shipping on orders above ₹300', discount: 40, maxDiscount: 40, minOrder: 300, usageLimit: 2000 },
  ]

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: {
        ...coupon,
        validUntil: new Date('2027-12-31'),
      },
    })
  }

  console.log('Seed completed successfully!')
  console.log(`- Admin: admin@janaushadhi.gov.in / admin123`)
  console.log(`- Customer: demo@example.com / customer123`)
  console.log(`- ${categories.length} categories`)
  console.log(`- ${medicines.length} medicines`)
  console.log(`- ${coupons.length} coupons`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
