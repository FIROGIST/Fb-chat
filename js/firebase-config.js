// إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB4jcqKRSKa6jLqDmSom31sWlDEIVDCRvs",
    authDomain: "fb-chat-f1040.firebaseapp.com",
    projectId: "fb-chat-f1040",
    storageBucket: "fb-chat-f1040.firebasestorage.app",
    messagingSenderId: "917873251539",
    appId: "1:917873251539:web:5e4fef504984497a0bf026",
    measurementId: "G-FXMNCKQTT7"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// الحصول على مراجع الخدمات
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

console.log('✅ Firebase تم التهيئة بنجاح');