// ตั้งค่าการเชื่อมต่อฐานข้อมูลของร้าน
//
// firebase: วางค่า firebaseConfig จาก Firebase console → Project settings → Your apps (Web)
//   ค่าเหล่านี้เป็นค่าสาธารณะของเว็บแอป ไม่ใช่รหัสลับ — สิทธิ์เข้าถึงข้อมูลคุมด้วย firestore.rules
//   ถ้าปล่อยเป็น null แอปจะเก็บข้อมูลในเบราว์เซอร์เครื่องนั้นแทน
// shopId: ชื่อชุดข้อมูลของร้าน (ใช้ร้านเดียวปล่อย 'main' ไว้)
window.KHLANGYA_CONFIG = {
  shopId: 'main',
  firebase: null,
};
