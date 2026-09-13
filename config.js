// ตั้งค่าการเชื่อมต่อฐานข้อมูลของร้าน
//
// firebase: ค่า firebaseConfig จาก Firebase console → Project settings → Your apps (Web)
//   ค่าเหล่านี้เป็นค่าสาธารณะของเว็บแอป ไม่ใช่รหัสลับ — สิทธิ์เข้าถึงข้อมูลคุมด้วย firestore.rules
//   ถ้าเปลี่ยนเป็น null แอปจะเก็บข้อมูลในเบราว์เซอร์เครื่องนั้นแทน
// shopId: ชื่อชุดข้อมูลของร้าน (ใช้ร้านเดียวปล่อย 'main' ไว้)
window.KHLANGYA_CONFIG = {
  shopId: 'main',
  firebase: {
    apiKey: 'AIzaSyCLo9vvDZw2Gr7Oxf14eudZesJIsex3bSU',
    authDomain: 'pharmacy-kanchatsuda.firebaseapp.com',
    projectId: 'pharmacy-kanchatsuda',
    storageBucket: 'pharmacy-kanchatsuda.firebasestorage.app',
    messagingSenderId: '205697019492',
    appId: '1:205697019492:web:2148a4f67b396cd8073971',
  },
};
