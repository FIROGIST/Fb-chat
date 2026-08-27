<?php
header('Content-Type: application/json');
require_once '../config/config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['search'])) {
            searchUsers($_GET['search']);
        } else {
            getAllUsers();
        }
        break;
    
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        createUser($data);
        break;
    
    default:
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}

function getAllUsers() {
    global $conn;
    
    $result = $conn->query("SELECT id, name, username, telegram_username, avatar, created_at FROM users");
    $users = [];
    
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    
    echo json_encode(['success' => true, 'users' => $users]);
}

function searchUsers($search) {
    global $conn;
    
    $stmt = $conn->prepare("SELECT id, name, username, telegram_username, avatar FROM users WHERE username LIKE ? OR name LIKE ?");
    $searchTerm = "%{$search}%";
    $stmt->bind_param("ss", $searchTerm, $searchTerm);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    
    echo json_encode(['success' => true, 'users' => $users]);
}

function createUser($data) {
    global $conn;
    
    $name = $data['name'];
    $username = $data['username'];
    $password = password_hash($data['password'], PASSWORD_DEFAULT);
    $telegram_username = $data['telegram_username'] ?? null;
    $avatar = $data['avatar'] ?? null;
    
    $stmt = $conn->prepare("INSERT INTO users (name, username, password, telegram_username, avatar) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $name, $username, $password, $telegram_username, $avatar);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'error' => $stmt->error]);
    }
}
?>