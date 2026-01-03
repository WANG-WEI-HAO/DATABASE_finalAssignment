// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For this mocked implementation, we will simulate the Firebase connection
// in a real scenario, you would put your actual config here.
const firebaseConfig = {
    apiKey: "AIzaSyD-YOUR_API_KEY",
    authDomain: "tw-stock-quant.firebaseapp.com",
    databaseURL: "https://tw-stock-quant-default-rtdb.firebaseio.com",
    projectId: "tw-stock-quant",
    storageBucket: "tw-stock-quant.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };
