<?php
// إعدادات البوت
define('BOT_TOKEN', '8941299403:AAGTMnpCSrScnk3fJSBMo0Sv4e6JhH38JFg');
define('ADMIN_ID', '5511952564');
define('API_URL', 'https://api.telegram.org/bot' . BOT_TOKEN);

// إعدادات قاعدة البيانات
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'fb_chat_db');

// إنشاء اتصال
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// إنشاء الجداول
$sql = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255),
    telegram_username VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

$conn->query($sql);
?>