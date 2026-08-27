<?php
header('Content-Type: application/json');
require_once '../config/config.php';

// استقبال طلبات API
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (isset($data['action'])) {
            switch ($data['action']) {
                case 'check_user':
                    checkTelegramUser($data['username']);
                    break;
                case 'send_notification':
                    sendNotification($data);
                    break;
                default:
                    echo json_encode(['success' => false, 'error' => 'Invalid action']);
            }
        }
        break;
    
    default:
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

function checkTelegramUser($username) {
    global $conn;
    
    // التحقق من تيليجرام
    $url = API_URL . "/getChat?chat_id=@{$username}";
    $response = file_get_contents($url);
    $telegramData = json_decode($response, true);
    
    // التحقق من قاعدة البيانات
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ? OR telegram_username = ?");
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $dbUser = $result->fetch_assoc();
    
    echo json_encode([
        'success' => true,
        'telegram_exists' => $telegramData['ok'],
        'telegram_info' => $telegramData['ok'] ? $telegramData['result'] : null,
        'db_user' => $dbUser
    ]);
}

function sendNotification($data) {
    $chatId = $data['chat_id'] ?? ADMIN_ID;
    $message = $data['message'] ?? '';
    
    $url = API_URL . "/sendMessage";
    $postData = [
        'chat_id' => $chatId,
        'text' => $message,
        'parse_mode' => 'HTML'
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    $response = curl_exec($ch);
    curl_close($ch);
    
    echo json_encode(['success' => true, 'response' => json_decode($response, true)]);
}
?>