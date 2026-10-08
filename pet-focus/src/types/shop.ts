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
  HAT_CROWN_GOLD_IMG,
  HAT_BEAR_HOOD_IMG,
  SUIT_IMPERIAL_CLOAK_IMG,
  SUIT_COSMIC_CAPE_IMG,
  SUIT_ROYAL_ROBE_IMG,
  SUIT_ASTRONAUT_IMG,
  SUIT_DINO_IMG,
  HAT_NINJA_IMG,
  HAT_HALO_IMG,
  HAT_PIRATE_IMG,
  SUIT_DOCTOR_IMG,
  SUIT_ANGEL_IMG,
  SUIT_NINJA_IMG,
  SUIT_SAMURAI_IMG,
  SUIT_MAID_IMG,
  SUIT_NAVAL_CAPTAIN_IMG,
  SUIT_PIRATE_IMG,
  SUIT_PRINCESS_PINK_IMG,
  SUIT_PRINCESS_GOLD_IMG,
  SUIT_PRINCESS_BLUE_IMG,
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
  /** Rive boolean name: legacy state machine input or Hats ViewModel property. */
  riveInput?: string
  // background items only
  bgColor?: string
  bgGradient?: [string, string]
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
  { id: 'hat_school', name: 'หมวกพ่อมด', emoji: '🧙', category: 'outfit', rarity: 'common', price: 60, currency: 'coin', description: 'หมวกวิเศษของแมว', image: WIZARD_HAT_IMG, riveInput: 'wizard_hat' },
  { id: 'glasses_sun', name: 'แว่นกันแดด', emoji: '🕶️', category: 'outfit', rarity: 'common', price: 90, currency: 'coin', description: 'ดูเท่มากเลย', image: SUNGLASSES_IMG, riveInput: 'sunglass' },
  { id: 'hat_straw', name: 'หมวกฟาง', emoji: '👒', category: 'outfit', rarity: 'common', price: 60, currency: 'coin', description: 'หมวกฟางสไตล์ทะเล', image: STRAW_HAT_IMG, riveInput: 'straw_hat' },
  { id: 'hat_tophat', name: 'หมวกทรงสูง', emoji: '🎩', category: 'outfit', rarity: 'rare', price: 150, currency: 'coin', description: 'หมวกทรงสูงสไตล์คุณชายสุดหรู', image: HAT_TOPHAT_IMG, riveInput: 'hat' },
  { id: 'hat_beret_brown', name: 'เบเร่ต์สีน้ำตาล', emoji: '🧢', category: 'outfit', rarity: 'common', price: 70, currency: 'coin', description: 'หมวกเบเร่ต์ลายอุ้งเท้าเก๋ๆ', image: HAT_BERET_BROWN_IMG, riveInput: 'hat2' },
  { id: 'hat_bucket', name: 'หมวกบักเก็ต', emoji: '🪣', category: 'outfit', rarity: 'common', price: 65, currency: 'coin', description: 'หมวกบักเก็ตลายอุ้งเท้าน่ารัก', image: HAT_BUCKET_IMG, riveInput: 'hat3' },
  { id: 'hat_beanie_purple', name: 'หมวกไหมพรมสีม่วง', emoji: '🧶', category: 'outfit', rarity: 'common', price: 80, currency: 'coin', description: 'อุ่นสบายพร้อมป้ายก้างปลา', image: HAT_BEANIE_PURPLE_IMG, riveInput: 'hat4' },
  { id: 'hat_beret_apple', name: 'เบเร่ต์แอปเปิ้ล', emoji: '🍎', category: 'outfit', rarity: 'rare', price: 135, currency: 'coin', description: 'หมวกเบเร่ต์แดงประดับใบแอปเปิ้ล', image: HAT_BERET_APPLE_IMG, riveInput: 'hat5' },
  { id: 'hat_flower_crown', name: 'มงกุฎดอกไม้ส้ม', emoji: '🌼', category: 'outfit', rarity: 'rare', price: 155, currency: 'coin', description: 'พวงมาลัยดอกไม้สีส้มสดใส', image: HAT_FLOWER_CROWN_IMG, riveInput: 'hat6' },
  { id: 'hat_cap_bow', name: 'หมวกแก๊ปโบว์ชมพู', emoji: '🎀', category: 'outfit', rarity: 'common', price: 85, currency: 'coin', description: 'หมวกแก๊ปประดับโบว์สีชมพูหวานๆ', image: HAT_CAP_BOW_IMG, riveInput: 'hat7' },
  { id: 'hat_cat_ears', name: 'หมวกหูแมว', emoji: '🐱', category: 'outfit', rarity: 'rare', price: 145, currency: 'coin', description: 'หมวกไหมพรมมีหูแมวน่ารัก', image: HAT_CAT_EARS_IMG, riveInput: 'hat8' },
  { id: 'hat_cap_fish', name: 'หมวกแก๊ปลายปลา', emoji: '🐟', category: 'outfit', rarity: 'common', price: 80, currency: 'coin', description: 'หมวกแก๊ปสีเขียวติดป้ายปลาสีสัน', image: HAT_CAP_FISH_IMG, riveInput: 'hat9' },
  { id: 'hat_beret_blue', name: 'เบเร่ต์สีฟ้า', emoji: '🧢', category: 'outfit', rarity: 'common', price: 75, currency: 'coin', description: 'หมวกเบเร่ต์สีฟ้าลายอุ้งเท้า', image: HAT_BERET_BLUE_IMG, riveInput: 'hat10' },
  { id: 'hat_crown_gold', name: 'มงกุฎทอง', emoji: '👑', category: 'outfit', rarity: 'legendary', price: 455, currency: 'coin', description: 'มงกุฎทองประดับเพชรสีฟ้า สมค่าราชาแห่งโฟกัส', image: HAT_CROWN_GOLD_IMG, riveInput: 'hat11' },
  { id: 'hat_bear_hood', name: 'หมวกฮู้ดหูหมี', emoji: '🐻', category: 'outfit', rarity: 'rare', price: 135, currency: 'coin', description: 'หมวกฮู้ดหูหมีน่ารักอบอุ่น', image: HAT_BEAR_HOOD_IMG, riveInput: 'hat12' },
  { id: 'outfit_raincoat', name: 'เสื้อกันฝนสีเหลือง', emoji: '🧥', category: 'outfit', rarity: 'rare', price: 170, currency: 'coin', description: 'เสื้อกันฝนสีเหลืองลายอุ้งเท้า กันฝนสุดเท่', image: HOOD_RAINCOAT_IMG, riveInput: 'hood' },
  { id: 'outfit_tuxedo', name: 'ชุดทักซิโด้', emoji: '🤵', category: 'outfit', rarity: 'legendary', price: 425, currency: 'coin', description: 'ทักซิโด้หรูหราสไตล์เจ้าบ่าว', image: SUIT_TUXEDO_IMG, riveInput: 'suit' },
  { id: 'outfit_coat', name: 'เสื้อโค้ทกันหนาว', emoji: '🧥', category: 'outfit', rarity: 'rare', price: 155, currency: 'coin', description: 'เสื้อโค้ทพร้อมผ้าพันคออุ่นๆ', image: COAT_IMG, riveInput: 'coat' },
  { id: 'glasses_round', name: 'แว่นทรงกลม', emoji: '👓', category: 'outfit', rarity: 'common', price: 85, currency: 'coin', description: 'แว่นทรงกลมสไตล์นักวิชาการ', image: GLASSES_ROUND_IMG, riveInput: 'glass2' },
  { id: 'outfit_uniform', name: 'ชุดนักเรียน', emoji: '👔', category: 'outfit', rarity: 'rare', price: 145, currency: 'coin', description: 'ชุดนักเรียนลายอุ้งเท้า ขยันเรียนสุดๆ', image: STUDENT_UNIFORM_IMG, riveInput: 'uniform' },
  { id: 'outfit_imperial_cloak', name: 'เสื้อคลุมจักรพรรดิ', emoji: '🌙', category: 'outfit', rarity: 'legendary', price: 470, currency: 'coin', description: 'เสื้อคลุมทองประดับพระจันทร์และดอกไม้ม่วง สมศักดิ์จักรพรรดิ', image: SUIT_IMPERIAL_CLOAK_IMG, riveInput: 'suit2' },
  { id: 'outfit_cosmic_cape', name: 'เสื้อคลุมพ่อมดจักรวาล', emoji: '✨', category: 'outfit', rarity: 'legendary', price: 435, currency: 'coin', description: 'เสื้อคลุมสีน้ำเงินยามค่ำคืน ประดับดาวและพระจันทร์เสี้ยว', image: SUIT_COSMIC_CAPE_IMG, riveInput: 'suit3' },
  { id: 'outfit_royal_robe', name: 'ชุดคลุมกษัตริย์', emoji: '🐾', category: 'outfit', rarity: 'legendary', price: 515, currency: 'coin', description: 'ชุดคลุมสีน้ำเงินขลิบขนสัตว์ ประดับตราอุ้งเท้าทอง สุดหรูหรา', image: SUIT_ROYAL_ROBE_IMG, riveInput: 'suit4' },
  { id: 'outfit_astronaut', name: 'ชุดนักบินอวกาศ', emoji: '🧑‍🚀', category: 'outfit', rarity: 'rare', price: 180, currency: 'coin', description: 'ชุดนักบินอวกาศพร้อมหมวกใส ติดตราอุ้งเท้าที่หน้าอก', image: SUIT_ASTRONAUT_IMG, riveInput: 'suit5' },
  { id: 'outfit_dino', name: 'ชุดไดโนเสาร์', emoji: '🦖', category: 'outfit', rarity: 'rare', price: 155, currency: 'coin', description: 'ชุดไดโนเสาร์สีเขียวขี้เล่น ลายท้องเหลืองสไตล์การ์ตูน', image: SUIT_DINO_IMG, riveInput: 'suit6' },
  { id: 'hat_ninja', name: 'ผ้าคาดหัวนินจา', emoji: '🥷', category: 'outfit', rarity: 'rare', price: 145, currency: 'coin', description: 'ผ้าคาดหัวสีดำสำหรับนินจาตัวน้อย', image: HAT_NINJA_IMG, riveInput: 'hat13' },
  { id: 'hat_halo', name: 'วงแหวนเทวดา', emoji: '😇', category: 'outfit', rarity: 'legendary', price: 395, currency: 'coin', description: 'วงแหวนสีทองเปล่งประกายเหนือศีรษะ', image: HAT_HALO_IMG, riveInput: 'hat14' },
  { id: 'hat_pirate', name: 'หมวกโจรสลัด', emoji: '🏴‍☠️', category: 'outfit', rarity: 'rare', price: 155, currency: 'coin', description: 'หมวกโจรสลัดสีดำขลิบทองพร้อมออกผจญภัย', image: HAT_PIRATE_IMG, riveInput: 'hat15' },
  { id: 'outfit_doctor', name: 'ชุดคุณหมอ', emoji: '🩺', category: 'outfit', rarity: 'rare', price: 170, currency: 'coin', description: 'เสื้อกาวน์สีขาวพร้อมหูฟังคุณหมอ', image: SUIT_DOCTOR_IMG, riveInput: 'suit7' },
  { id: 'outfit_angel', name: 'ชุดเทวดา', emoji: '😇', category: 'outfit', rarity: 'legendary', price: 455, currency: 'coin', description: 'ชุดสีขาวขลิบทองพร้อมปีกเทวดา', image: SUIT_ANGEL_IMG, riveInput: 'suit8' },
  { id: 'outfit_ninja', name: 'ชุดนินจา', emoji: '🥷', category: 'outfit', rarity: 'rare', price: 180, currency: 'coin', description: 'ชุดนินจาสีดำคาดผ้าแดงพร้อมดาบคู่ใจ', image: SUIT_NINJA_IMG, riveInput: 'suit9' },
  { id: 'outfit_samurai', name: 'ชุดซามูไร', emoji: '⚔️', category: 'outfit', rarity: 'legendary', price: 435, currency: 'coin', description: 'เกราะซามูไรสีแดงประดับลายทอง', image: SUIT_SAMURAI_IMG, riveInput: 'suit10' },
  { id: 'outfit_maid', name: 'ชุดเมด', emoji: '🎀', category: 'outfit', rarity: 'rare', price: 155, currency: 'coin', description: 'ชุดเมดสีดำขาวแต่งระบายและโบว์แดง', image: SUIT_MAID_IMG, riveInput: 'suit11' },
  { id: 'outfit_naval_captain', name: 'ชุดกัปตันเรือ', emoji: '⚓', category: 'outfit', rarity: 'legendary', price: 425, currency: 'coin', description: 'เสื้อกัปตันสีน้ำเงินเข้มประดับขอบทอง', image: SUIT_NAVAL_CAPTAIN_IMG, riveInput: 'suit12' },
  { id: 'outfit_pirate', name: 'ชุดโจรสลัด', emoji: '🏴‍☠️', category: 'outfit', rarity: 'rare', price: 170, currency: 'coin', description: 'ชุดโจรสลัดสีแดงพร้อมเข็มขัดสำหรับนักผจญภัย', image: SUIT_PIRATE_IMG, riveInput: 'suit13' },
  { id: 'outfit_princess_pink', name: 'ชุดเจ้าหญิงสีชมพู', emoji: '👗', category: 'outfit', rarity: 'legendary', price: 410, currency: 'coin', description: 'ชุดกระโปรงสีชมพูประดับโบว์และระบาย', image: SUIT_PRINCESS_PINK_IMG, riveInput: 'suit14' },
  { id: 'outfit_princess_gold', name: 'ชุดเจ้าหญิงสีทอง', emoji: '👗', category: 'outfit', rarity: 'legendary', price: 425, currency: 'coin', description: 'ชุดกระโปรงสีเหลืองทองประดับดอกไม้', image: SUIT_PRINCESS_GOLD_IMG, riveInput: 'suit15' },
  { id: 'outfit_princess_blue', name: 'ชุดเจ้าหญิงสีฟ้า', emoji: '👗', category: 'outfit', rarity: 'legendary', price: 410, currency: 'coin', description: 'ชุดกระโปรงสีฟ้าขลิบลายทองอ่อนหวาน', image: SUIT_PRINCESS_BLUE_IMG, riveInput: 'suit16' },
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
  { id: 'bg_sky', name: 'ท้องฟ้าใส', emoji: '☁️', category: 'background', rarity: 'common', price: 30, currency: 'coin', description: 'ฟ้าสว่างสดชื่น', bgColor: '#E3F2FD', surfaceColor: '#1976D2' },
  { id: 'bg_pink', name: 'ชมพูหวาน', emoji: '🌸', category: 'background', rarity: 'common', price: 30, currency: 'coin', description: 'หวานน่ารัก', bgColor: '#FCE4EC', surfaceColor: '#AD1457' },
  { id: 'bg_mint', name: 'มิ้นต์สดใส', emoji: '🌿', category: 'background', rarity: 'common', price: 30, currency: 'coin', description: 'สดชื่นเย็นตา', bgColor: '#E8F5E9', surfaceColor: '#2E7D32' },
  { id: 'bg_lavender', name: 'ลาเวนเดอร์', emoji: '💜', category: 'background', rarity: 'common', price: 30, currency: 'coin', description: 'ม่วงอ่อนนุ่มตา', bgColor: '#F3E5F5', surfaceColor: '#6A1B9A' },
  { id: 'bg_peach', name: 'พีชอ่อน', emoji: '🍑', category: 'background', rarity: 'common', price: 35, currency: 'coin', description: 'อบอุ่นหัวใจ', bgColor: '#FFF3E0', surfaceColor: '#F4511E' },
  { id: 'bg_ocean', name: 'ใต้ทะเล', emoji: '🌊', category: 'background', rarity: 'rare', price: 120, currency: 'coin', description: 'ลึกลับใต้น้ำ', bgColor: '#006994', bgGradient: ['#006994', '#00BCD4'], surfaceColor: '#00546e' },
  { id: 'bg_sunset', name: 'พระอาทิตย์ตก', emoji: '🌅', category: 'background', rarity: 'rare', price: 120, currency: 'coin', description: 'สวยงามยามเย็น', bgColor: '#FF6B6B', bgGradient: ['#FF6B6B', '#FFD93D'], surfaceColor: '#C62828' },
  { id: 'bg_galaxy', name: 'กาแลกซี่', emoji: '🌌', category: 'background', rarity: 'legendary', price: 335, currency: 'coin', description: 'ห้วงอวกาศ', bgColor: '#0D0D2B', bgGradient: ['#0D0D2B', '#5B2D8E'], surfaceColor: '#2D1260' },
  { id: 'bg_rainbow', name: 'สายรุ้ง', emoji: '🌈', category: 'background', rarity: 'legendary', price: 365, currency: 'coin', description: 'สีสันมหาสนุก', bgColor: '#FF6B6B', bgGradient: ['#FF6B6B', '#4ECDC4'], surfaceColor: '#C62828' },
  { id: 'bg_cotton_candy', name: 'สายไหมหวาน', emoji: '🍭', category: 'background', rarity: 'common', price: 55, currency: 'coin', description: 'ชมพูฟ้าน่ารัก', bgColor: '#FFAFCC', bgGradient: ['#FFAFCC', '#A2D2FF'], surfaceColor: '#6A3B6E' },
  { id: 'bg_mango', name: 'มะม่วงสุก', emoji: '🥭', category: 'background', rarity: 'common', price: 55, currency: 'coin', description: 'เหลืองส้มสดใส', bgColor: '#FFD93D', bgGradient: ['#FFD93D', '#FF9A3D'], surfaceColor: '#B34700' },
  { id: 'bg_watermelon', name: 'แตงโมฉ่ำ', emoji: '🍉', category: 'background', rarity: 'common', price: 55, currency: 'coin', description: 'แดงเขียวสดชื่น', bgColor: '#F94C66', bgGradient: ['#F94C66', '#6FCF97'], surfaceColor: '#7A1F2B' },
  { id: 'bg_lemonade', name: 'เลมอนเนดเย็น', emoji: '🍋', category: 'background', rarity: 'common', price: 55, currency: 'coin', description: 'เหลืองชมพูสดใส', bgColor: '#FFF9C4', bgGradient: ['#FFF9C4', '#FF61A6'], surfaceColor: '#8C2F5B' },
  { id: 'bg_mint_choco', name: 'มินต์ช็อกโกแลต', emoji: '🍃', category: 'background', rarity: 'common', price: 55, currency: 'coin', description: 'เขียวมินต์เย็นตา', bgColor: '#0BAB64', bgGradient: ['#0BAB64', '#3BB78F'], surfaceColor: '#0B4D3A' },
  { id: 'bg_morning_sky', name: 'ท้องฟ้ายามเช้า', emoji: '🌤️', category: 'background', rarity: 'common', price: 55, currency: 'coin', description: 'ชมพูฟ้าอ่อนละมุน', bgColor: '#FFDDE1', bgGradient: ['#FFDDE1', '#EE9CA7'], surfaceColor: '#8B4A5C' },
  { id: 'bg_flamingo', name: 'นกฟลามิงโก้', emoji: '🦩', category: 'background', rarity: 'common', price: 55, currency: 'coin', description: 'ชมพูสดสไตล์ทรอปิคอล', bgColor: '#FBD3E9', bgGradient: ['#FBD3E9', '#BB377D'], surfaceColor: '#7A2E52' },
  { id: 'bg_ice', name: 'น้ำแข็งขั้วโลก', emoji: '❄️', category: 'background', rarity: 'common', price: 55, currency: 'coin', description: 'ฟ้าเย็นสดใส', bgColor: '#83A4D4', bgGradient: ['#83A4D4', '#B6FBFF'], surfaceColor: '#2E5C8A' },
  { id: 'bg_cherry', name: 'เชอร์รี่หวาน', emoji: '🍒', category: 'background', rarity: 'common', price: 55, currency: 'coin', description: 'แดงส้มสดชื่น', bgColor: '#EB3349', bgGradient: ['#EB3349', '#F45C43'], surfaceColor: '#7A1620' },
  { id: 'bg_bubblegum', name: 'บับเบิ้ลกัม', emoji: '🎈', category: 'background', rarity: 'common', price: 55, currency: 'coin', description: 'ชมพูพาสเทลหวานฟรุ้งฟริ้ง', bgColor: '#FF9A9E', bgGradient: ['#FF9A9E', '#FAD0C4'], surfaceColor: '#8C3B57' },
  { id: 'bg_aurora', name: 'ออโรร่าเหนือ', emoji: '🌠', category: 'background', rarity: 'rare', price: 110, currency: 'coin', description: 'แสงเหนือพลิ้วไหว', bgColor: '#00C9A7', bgGradient: ['#00C9A7', '#845EC2'], surfaceColor: '#3A1C71' },
  { id: 'bg_grape_soda', name: 'กราวเบอร์รี่โซดา', emoji: '🍇', category: 'background', rarity: 'rare', price: 110, currency: 'coin', description: 'ม่วงบานเย็นสดใส', bgColor: '#7F00FF', bgGradient: ['#7F00FF', '#E100FF'], surfaceColor: '#4B0082' },
  { id: 'bg_night_mist', name: 'หมอกราตรี', emoji: '🌫️', category: 'background', rarity: 'rare', price: 135, currency: 'coin', description: 'เขียวฟ้าตัดกับราตรี', bgColor: '#43C6AC', bgGradient: ['#43C6AC', '#191654'], surfaceColor: '#12203A' },
  { id: 'bg_forest', name: 'ป่าเขียวครึ้ม', emoji: '🌲', category: 'background', rarity: 'rare', price: 110, currency: 'coin', description: 'เขียวเข้มร่มรื่น', bgColor: '#134E5E', bgGradient: ['#134E5E', '#71B280'], surfaceColor: '#0E3B2E' },
  { id: 'bg_volcano', name: 'ลาวาภูเขาไฟ', emoji: '🌋', category: 'background', rarity: 'rare', price: 135, currency: 'coin', description: 'แดงส้มตัดน้ำเงินเข้ม', bgColor: '#DC2424', bgGradient: ['#DC2424', '#4A569D'], surfaceColor: '#5A1414' },
  { id: 'bg_desert', name: 'ทะเลทรายยามเย็น', emoji: '🏜️', category: 'background', rarity: 'rare', price: 120, currency: 'coin', description: 'ส้มทองตัดฟ้าค่ำ', bgColor: '#F8B500', bgGradient: ['#F8B500', '#6478FB'], surfaceColor: '#4A3B78' },
  { id: 'bg_twilight', name: 'สนธยา', emoji: '🌆', category: 'background', rarity: 'rare', price: 110, currency: 'coin', description: 'น้ำเงินเข้มยามพลบค่ำ', bgColor: '#0F2027', bgGradient: ['#0F2027', '#2C5364'], surfaceColor: '#0F2027' },
  { id: 'bg_deep_space', name: 'อวกาศไร้ขอบ', emoji: '🪐', category: 'background', rarity: 'legendary', price: 300, currency: 'coin', description: 'มืดลึกลับกว่ากาแลกซี่', bgColor: '#000000', bgGradient: ['#000000', '#4B0082'], surfaceColor: '#1A0033' },
  { id: 'bg_cyber', name: 'ไซเบอร์นีออน', emoji: '🌃', category: 'background', rarity: 'legendary', price: 290, currency: 'coin', description: 'นีออนสดจัดสไตล์อนาคต', bgColor: '#00F5FF', bgGradient: ['#00F5FF', '#FF00E5'], surfaceColor: '#3D0066' },
  { id: 'bg_emerald', name: 'มรกตหรูหรา', emoji: '💎', category: 'background', rarity: 'legendary', price: 270, currency: 'coin', description: 'เขียวมรกตเรืองแสง', bgColor: '#0F9B0F', bgGradient: ['#0F9B0F', '#00C853'], surfaceColor: '#065A0F' },

  // ─── Pets ────────────────────────────────────────────────────────────────────
  { id: 'pet_dog', name: 'สุนัข', emoji: '🐕', category: 'pet', rarity: 'rare', price: 70, currency: 'coin', description: 'เพื่อนซี้น้องหมา', petId: 'pet_dog' },
  { id: 'pet_orange_cat', name: 'แมวส้ม', emoji: '🧡', category: 'pet', rarity: 'rare', price: 90, currency: 'coin', description: 'แมวส้มน่ารัก', petId: 'pet_orange_cat' },
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
