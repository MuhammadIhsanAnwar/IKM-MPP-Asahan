<?php
// Set timezone to Indonesia (WIB)
date_default_timezone_set('Asia/Jakarta');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// ============================================
// DATABASE CONNECTION
// ============================================

$host = 'localhost';
$username = 'neoz6813_ikmmppasahan';
$password = 'ikmmppasahan';
$database = 'neoz6813_ikmmppasahan';

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal terhubung ke database: ' . $conn->connect_error
    ]);
    exit;
}

$conn->set_charset('utf8mb4');

// ============================================
// API HANDLER
// ============================================

// Get JSON input from POST body
$jsonInput = json_decode(file_get_contents('php://input'), true);
$action = $jsonInput['action'] ?? $_GET['action'] ?? '';
$data = $jsonInput ?? [];

$response = [
    'success' => false,
    'message' => 'Action tidak dikenali',
    'data' => null
];

switch ($action) {
    case 'saveVote':
        $response = handleSaveVote($conn, $data);
        break;
    case 'getVotes':
        $response = handleGetVotes($conn);
        break;
    case 'deleteAllVotes':
        $response = handleDeleteAllVotes($conn);
        break;
    case 'deleteVotesByIds':
        $response = handleDeleteVotesByIds($conn, $data);
        break;
    default:
        http_response_code(400);
}

echo json_encode($response);
$conn->close();

// ============================================
// HANDLER FUNCTIONS
// ============================================

function handleSaveVote($conn, $data) {
    try {
        // Debug logging
        error_log('API saveVote received: ' . json_encode($data));
        
        $loketId = intval($data['loketId'] ?? 0);
        $rating = floatval($data['rating'] ?? 0);
        $answers = json_encode($data['answers'] ?? []);
        $respondent = json_encode($data['respondent'] ?? []);
        $createdAt = date('Y-m-d H:i:s');

        if ($loketId < 1 || $loketId > 23) {
            return [
                'success' => false,
                'message' => 'Loket ID tidak valid'
            ];
        }

        $stmt = $conn->prepare(
            'INSERT INTO votes (loket_id, rating, answers, respondent, created_at) 
             VALUES (?, ?, ?, ?, ?)'
        );

        if (!$stmt) {
            error_log('Prepare failed: ' . $conn->error);
            return [
                'success' => false,
                'message' => 'Prepare statement gagal: ' . $conn->error
            ];
        }

        $stmt->bind_param(
            'idsss',
            $loketId,
            $rating,
            $answers,
            $respondent,
            $createdAt
        );

        if (!$stmt->execute()) {
            error_log('Execute failed: ' . $stmt->error);
            return [
                'success' => false,
                'message' => 'Execute statement gagal: ' . $stmt->error
            ];
        }

        error_log('Vote saved successfully for loket: ' . $loketId);
        $stmt->close();

        return [
            'success' => true,
            'message' => 'Data survei berhasil disimpan',
            'data' => true
        ];

    } catch (Exception $e) {
        error_log('Exception: ' . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ];
    }
}

function handleGetVotes($conn) {
    try {
        $sql = 'SELECT id, loket_id, rating, answers, respondent, created_at 
                FROM votes 
                ORDER BY created_at DESC';
        
        $result = $conn->query($sql);

        if (!$result) {
            return [
                'success' => false,
                'message' => 'Query gagal: ' . $conn->error
            ];
        }

        $votes = [];
        while ($row = $result->fetch_assoc()) {
            $votes[] = [
                'id' => intval($row['id']),
                'loket_id' => intval($row['loket_id']),
                'rating' => floatval($row['rating']),
                'answers' => json_decode($row['answers'], true),
                'respondent' => json_decode($row['respondent'], true),
                'created_at' => $row['created_at']
            ];
        }

        return [
            'success' => true,
            'message' => 'Data berhasil diambil',
            'data' => $votes
        ];

    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ];
    }
}

function handleDeleteAllVotes($conn) {
    try {
        if (!$conn->query('DELETE FROM votes')) {
            return [
                'success' => false,
                'message' => 'Gagal menghapus data: ' . $conn->error
            ];
        }

        return [
            'success' => true,
            'message' => 'Semua data survei berhasil dihapus',
            'data' => true
        ];

    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ];
    }
}

function handleDeleteVotesByIds($conn, $data) {
    try {
        $voteIds = $data['voteIds'] ?? [];
        
        if (empty($voteIds)) {
            return [
                'success' => false,
                'message' => 'Tidak ada ID yang diberikan untuk dihapus'
            ];
        }

        // Validate and sanitize IDs
        $ids = array_map('intval', $voteIds);
        $idList = implode(',', $ids);

        if (!$conn->query("DELETE FROM votes WHERE id IN ($idList)")) {
            return [
                'success' => false,
                'message' => 'Gagal menghapus data: ' . $conn->error
            ];
        }

        $affectedRows = $conn->affected_rows;

        return [
            'success' => true,
            'message' => "$affectedRows data responden berhasil dihapus",
            'data' => [
                'deletedCount' => $affectedRows
            ]
        ];

    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ];
    }
}
?>
