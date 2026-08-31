/** quest_id → display title (sync with pet-focus CHORE_QUESTS) */
export const CHORE_QUEST_LABELS: Record<string, string> = {
  chore_sweep: 'กวาดบ้าน',
  chore_dishes: 'ล้างจาน',
  chore_desk: 'จัดโต๊ะเรียน',
  chore_laundry: 'รีดเสื้อผ้า',
  chore_water_plants: 'รดน้ำต้นไม้',
  chore_make_bed: 'จัดเตียงนอน',
  chore_fold_towel: 'พับผ้าเช็ดตัว',
  chore_wipe_mirror: 'เช็ดกระจก',
  chore_wipe_dining_table: 'เช็ดโต๊ะกินข้าว',
  chore_wash_bottle: 'ล้างขวดน้ำ',
  chore_pack_bag: 'จัดกระเป๋าเป้ไปโรงเรียน',
  chore_put_away_dishes: 'เก็บจานเข้าตู้',
  chore_arrange_pillows: 'จัดหมอน/โซฟา',
  chore_wipe_window: 'เช็ดหน้าต่าง',
  chore_sort_laundry_basket: 'เก็บผ้าใส่ตะกร้า',
  chore_clean_shoes: 'ทำความสะอาดรองเท้า',
  chore_vacuum: 'ดูดฝุ่น',
  chore_trash: 'ทิ้งขยะ/แยกขยะ',
  chore_organize_closet: 'จัดตู้เสื้อผ้า',
  chore_clean_fan: 'เช็ดพัดลม',
  chore_organize_bookshelf: 'จัดชั้นหนังสือ',
  chore_pack_toys: 'เก็บของเล่น',
  chore_feed_pet: 'ให้อาหารสัตว์เลี้ยง',
  chore_sweep_leaves: 'กวาดใบไม้',
  chore_clean_bathroom: 'ทำความสะอาดห้องน้ำ',
  chore_mop_floor: 'ถูพื้น',
}

export function resolveChoreQuestLabel(questId: string): string {
  return CHORE_QUEST_LABELS[questId] ?? questId
}
