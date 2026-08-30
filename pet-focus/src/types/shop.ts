import { PetId } from '@/types/pet'
import {
  STRAW_HAT_IMG,
  WIZARD_HAT_IMG,
  SUNGLASSES_IMG,
  HAT_TOPHAT_IMG,
  HAT_BERET_BROWN_IMG,
  HAT_BUCKET_IMG,
  HAT_BEANIE_PURPLE_IMG,
  HAT_BERET_APPLE_IMG,
  HAT_FLOWER_CROWN_IMG,
  HAT_CAP_BOW_IMG,
  HAT_CAT_EARS_IMG,
  HAT_CAP_FISH_IMG,
  HAT_BERET_BLUE_IMG,
  HOOD_RAINCOAT_IMG,
  SUIT_TUXEDO_IMG,
  COAT_IMG,
  GLASSES_ROUND_IMG,
  STUDENT_UNIFORM_IMG,
} from '@/assets/shopAssets'

export type ItemCategory = 'outfit' | 'room' | 'background' | 'pet'
export type ItemRarity = 'common' | 'rare' | 'legendary'
export type ItemCurrency = 'coin'

export interface ShopItem {
  id: string
  name: string
  emoji: string
  category: ItemCategory
  rarity: ItemRarity
  price: number
  currency: ItemCurrency
  description: string
  /** PNG thumbnail for outfit items */
  image?: number
  /** Rive state machine boolean input name (outfit items) */
  riveInput?: string
  // background items only
  bgColor?: string
  bgGradient?: [string, string]
  tabBarColor?: string
  surfaceColor?: string
  petId?: PetId
}

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#A0A878',
  rare: '#5DB347',
  legendary: '#F5C518',
}

export const RARITY_LABELS: Record<ItemRarity, string> = {
  common: 'ธรรมดา',
  rare: 'หายาก',
  legendary: 'ตำนาน',
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'hat_school', name: 'หมวกพ่อมด', emoji: '🧙', category: 'outfit', rarity: 'common', price: 100, currency: 'coin', description: 'หมวกวิเศษของแมว', image: WIZARD_HAT_IMG, riveInput: 'wizard_hat' },
  { id: 'glasses_sun', name: 'แว่นกันแดด', emoji: '🕶️', category: 'outfit', rarity: 'common', price: 150, currency: 'coin', description: 'ดูเท่มากเลย', image: SUNGLASSES_IMG, riveInput: 'sunglass' },
  { id: 'hat_straw', name: 'หมวกฟาง', emoji: '👒', category: 'outfit', rarity: 'common', price: 100, currency: 'coin', description: 'หมวกฟางสไตล์ทะเล', image: STRAW_HAT_IMG, riveInput: 'straw_hat' },
  { id: 'hat_tophat', name: 'หมวกทรงสูง', emoji: '🎩', category: 'outfit', rarity: 'rare', price: 250, currency: 'coin', description: 'หมวกทรงสูงสไตล์คุณชายสุดหรู', image: HAT_TOPHAT_IMG, riveInput: 'hat' },
  { id: 'hat_beret_brown', name: 'เบเร่ต์สีน้ำตาล', emoji: '🧢', category: 'outfit', rarity: 'common', price: 120, currency: 'coin', description: 'หมวกเบเร่ต์ลายอุ้งเท้าเก๋ๆ', image: HAT_BERET_BROWN_IMG, riveInput: 'hat2' },
  { id: 'hat_bucket', name: 'หมวกบักเก็ต', emoji: '🪣', category: 'outfit', rarity: 'common', price: 110, currency: 'coin', description: 'หมวกบักเก็ตลายอุ้งเท้าน่ารัก', image: HAT_BUCKET_IMG, riveInput: 'hat3' },
  { id: 'hat_beanie_purple', name: 'หมวกไหมพรมสีม่วง', emoji: '🧶', category: 'outfit', rarity: 'common', price: 130, currency: 'coin', description: 'อุ่นสบายพร้อมป้ายก้างปลา', image: HAT_BEANIE_PURPLE_IMG, riveInput: 'hat4' },
  { id: 'hat_beret_apple', name: 'เบเร่ต์แอปเปิ้ล', emoji: '🍎', category: 'outfit', rarity: 'rare', price: 220, currency: 'coin', description: 'หมวกเบเร่ต์แดงประดับใบแอปเปิ้ล', image: HAT_BERET_APPLE_IMG, riveInput: 'hat5' },
  { id: 'hat_flower_crown', name: 'มงกุฎดอกไม้ส้ม', emoji: '🌼', category: 'outfit', rarity: 'rare', price: 260, currency: 'coin', description: 'พวงมาลัยดอกไม้สีส้มสดใส', image: HAT_FLOWER_CROWN_IMG, riveInput: 'hat6' },
  { id: 'hat_cap_bow', name: 'หมวกแก๊ปโบว์ชมพู', emoji: '🎀', category: 'outfit', rarity: 'common', price: 140, currency: 'coin', description: 'หมวกแก๊ปประดับโบว์สีชมพูหวานๆ', image: HAT_CAP_BOW_IMG, riveInput: 'hat7' },
  { id: 'hat_cat_ears', name: 'หมวกหูแมว', emoji: '🐱', category: 'outfit', rarity: 'rare', price: 240, currency: 'coin', description: 'หมวกไหมพรมมีหูแมวน่ารัก', image: HAT_CAT_EARS_IMG, riveInput: 'hat8' },
  { id: 'hat_cap_fish', name: 'หมวกแก๊ปลายปลา', emoji: '🐟', category: 'outfit', rarity: 'common', price: 130, currency: 'coin', description: 'หมวกแก๊ปสีเขียวติดป้ายปลาสีสัน', image: HAT_CAP_FISH_IMG, riveInput: 'hat9' },
  { id: 'hat_beret_blue', name: 'เบเร่ต์สีฟ้า', emoji: '🧢', category: 'outfit', rarity: 'common', price: 120, currency: 'coin', description: 'หมวกเบเร่ต์สีฟ้าลายอุ้งเท้า', image: HAT_BERET_BLUE_IMG, riveInput: 'hat10' },
  { id: 'outfit_raincoat', name: 'เสื้อกันฝนสีเหลือง', emoji: '🧥', category: 'outfit', rarity: 'rare', price: 280, currency: 'coin', description: 'เสื้อกันฝนสีเหลืองลายอุ้งเท้า กันฝนสุดเท่', image: HOOD_RAINCOAT_IMG, riveInput: 'hood' },
  { id: 'outfit_tuxedo', name: 'ชุดทักซิโด้', emoji: '🤵', category: 'outfit', rarity: 'legendary', price: 700, currency: 'coin', description: 'ทักซิโด้หรูหราสไตล์เจ้าบ่าว', image: SUIT_TUXEDO_IMG, riveInput: 'suit' },
  { id: 'outfit_coat', name: 'เสื้อโค้ทกันหนาว', emoji: '🧥', category: 'outfit', rarity: 'rare', price: 260, currency: 'coin', description: 'เสื้อโค้ทพร้อมผ้าพันคออุ่นๆ', image: COAT_IMG, riveInput: 'coat' },
  { id: 'glasses_round', name: 'แว่นทรงกลม', emoji: '👓', category: 'outfit', rarity: 'common', price: 140, currency: 'coin', description: 'แว่นทรงกลมสไตล์นักวิชาการ', image: GLASSES_ROUND_IMG, riveInput: 'glass2' },
  { id: 'outfit_uniform', name: 'ชุดนักเรียน', emoji: '👔', category: 'outfit', rarity: 'rare', price: 240, currency: 'coin', description: 'ชุดนักเรียนลายอุ้งเท้า ขยันเรียนสุดๆ', image: STUDENT_UNIFORM_IMG, riveInput: 'uniform' },
  // { id: 'scarf_red', name: 'ผ้าพันคอแดง', emoji: '🧣', category: 'outfit', rarity: 'common', price: 80, currency: 'coin', description: 'อบอุ่นสบายใจ' },
  // { id: 'wings_butterfly', name: 'ปีกผีเสื้อ', emoji: '🦋', category: 'outfit', rarity: 'rare', price: 300, currency: 'coin', description: 'บินได้เหมือนนางฟ้า' },
  // { id: 'crown_gold', name: 'มงกุฎทอง', emoji: '👑', category: 'outfit', rarity: 'legendary', price: 800, currency: 'coin', description: 'ราชาแห่งโฟกัส' },
  // { id: 'bow_pink', name: 'โบว์ชมพู', emoji: '🎀', category: 'outfit', rarity: 'common', price: 60, currency: 'coin', description: 'น่ารักมากจ้า' },
  // { id: 'room_bed', name: 'เตียงนอน', emoji: '🛏️', category: 'room', rarity: 'common', price: 200, currency: 'coin', description: 'นอนหลับฝันดี' },
  // { id: 'room_plant', name: 'ต้นไม้', emoji: '🌱', category: 'room', rarity: 'common', price: 80, currency: 'coin', description: 'ห้องสดชื่น' },
  // { id: 'room_lamp', name: 'โคมไฟ', emoji: '🪔', category: 'room', rarity: 'common', price: 120, currency: 'coin', description: 'แสงอบอุ่นยามเย็น' },
  // { id: 'room_tv', name: 'โทรทัศน์', emoji: '📺', category: 'room', rarity: 'rare', price: 350, currency: 'coin', description: 'ดูหนังได้แบบ premium' },
  // { id: 'room_piano', name: 'เปียโน', emoji: '🎹', category: 'room', rarity: 'legendary', price: 700, currency: 'coin', description: 'บรรเลงเพลงสุดหรู' },
  // ─── Backgrounds ────────────────────────────────────────────────────────────
  { id: 'bg_sky', name: 'ท้องฟ้าใส', emoji: '☁️', category: 'background', rarity: 'common', price: 50, currency: 'coin', description: 'ฟ้าสว่างสดชื่น', bgColor: '#E3F2FD', tabBarColor: '#1565C0', surfaceColor: '#1976D2' },
  { id: 'bg_pink', name: 'ชมพูหวาน', emoji: '🌸', category: 'background', rarity: 'common', price: 50, currency: 'coin', description: 'หวานน่ารัก', bgColor: '#FCE4EC', tabBarColor: '#880E4F', surfaceColor: '#AD1457' },
  { id: 'bg_mint', name: 'มิ้นต์สดใส', emoji: '🌿', category: 'background', rarity: 'common', price: 50, currency: 'coin', description: 'สดชื่นเย็นตา', bgColor: '#E8F5E9', tabBarColor: '#1B5E20', surfaceColor: '#2E7D32' },
  { id: 'bg_lavender', name: 'ลาเวนเดอร์', emoji: '💜', category: 'background', rarity: 'common', price: 50, currency: 'coin', description: 'ม่วงอ่อนนุ่มตา', bgColor: '#F3E5F5', tabBarColor: '#4A148C', surfaceColor: '#6A1B9A' },
  { id: 'bg_peach', name: 'พีชอ่อน', emoji: '🍑', category: 'background', rarity: 'common', price: 60, currency: 'coin', description: 'อบอุ่นหัวใจ', bgColor: '#FFF3E0', tabBarColor: '#E65100', surfaceColor: '#F4511E' },
  { id: 'bg_ocean', name: 'ใต้ทะเล', emoji: '🌊', category: 'background', rarity: 'rare', price: 200, currency: 'coin', description: 'ลึกลับใต้น้ำ', bgGradient: ['#006994', '#00BCD4'], tabBarColor: '#003d5b', surfaceColor: '#00546e' },
  { id: 'bg_sunset', name: 'พระอาทิตย์ตก', emoji: '🌅', category: 'background', rarity: 'rare', price: 200, currency: 'coin', description: 'สวยงามยามเย็น', bgGradient: ['#FF6B6B', '#FFD93D'], tabBarColor: '#B71C1C', surfaceColor: '#C62828' },
  { id: 'bg_galaxy', name: 'กาแลกซี่', emoji: '🌌', category: 'background', rarity: 'legendary', price: 550, currency: 'coin', description: 'ห้วงอวกาศ', bgGradient: ['#0D0D2B', '#5B2D8E'], tabBarColor: '#1A0A3D', surfaceColor: '#2D1260' },
  { id: 'bg_rainbow', name: 'สายรุ้ง', emoji: '🌈', category: 'background', rarity: 'legendary', price: 600, currency: 'coin', description: 'สีสันมหาสนุก', bgGradient: ['#FF6B6B', '#4ECDC4'], tabBarColor: '#B71C1C', surfaceColor: '#C62828' },

  // ─── Pets ────────────────────────────────────────────────────────────────────
  { id: 'pet_dog', name: 'สุนัข', emoji: '🐕', category: 'pet', rarity: 'rare', price: 120, currency: 'coin', description: 'เพื่อนซี้น้องหมา', petId: 'pet_dog' },
  { id: 'pet_orange_cat', name: 'แมวส้ม', emoji: '🧡', category: 'pet', rarity: 'rare', price: 150, currency: 'coin', description: 'แมวส้มน่ารัก', petId: 'pet_orange_cat' },
  // { id: 'pet_rabbit', name: 'กระต่าย', emoji: '🐇', category: 'pet', rarity: 'rare', price: 500, currency: 'coin', description: 'กระโดดไปกระโดดมา' },
  // { id: 'pet_dragon', name: 'มังกร', emoji: '🐲', category: 'pet', rarity: 'legendary', price: 1200, currency: 'coin', description: 'มังกรผู้พิทักษ์' },
]

export const OUTFIT_ITEMS = SHOP_ITEMS.filter((i) => i.category === 'outfit')

export function getOutfitRiveInputs(equippedItemIds: string[]): Record<string, boolean> {
  const inputs: Record<string, boolean> = {}
  for (const item of OUTFIT_ITEMS) {
    if (!item.riveInput) continue
    inputs[item.riveInput] = equippedItemIds.includes(item.id)
  }
  return inputs
}
