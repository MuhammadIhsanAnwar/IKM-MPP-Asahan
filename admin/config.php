<?php
/**
 * Configuration File untuk IKM Survey Application
 * Edit file ini untuk kustomisasi database dan setting lainnya
 */

// ============================================
// DATABASE CONFIGURATION
// ============================================

define('DB_HOST', 'localhost');
define('DB_USER', 'neoz6813_ikmmppasahan');
define('DB_PASS', 'ikmmppasahan');
define('DB_NAME', 'neoz6813_ikmmppasahan');

// ============================================
// APPLICATION CONFIGURATION
// ============================================

// Admin PIN (JANGAN LUPA UBAH INI UNTUK PRODUCTION!)
define('ADMIN_PIN', '@dmin123');

// Total Loket
define('TOTAL_LOKET', 23);

// Application Name
define('APP_NAME', 'Survei Kepuasan Masyarakat (IKM)');

// Application Version
define('APP_VERSION', '1.0.0');

// ============================================
// SECURITY CONFIGURATION
// ============================================

// Enable CORS (untuk development saja, jangan di production)
define('ALLOW_CORS', true);

// Session timeout (dalam menit)
define('SESSION_TIMEOUT', 30);

// Max login attempts sebelum lockout
define('MAX_LOGIN_ATTEMPTS', 5);

// ============================================
// LOGGING CONFIGURATION
// ============================================

// Enable error logging
define('ENABLE_ERROR_LOG', true);

// Log file location
define('LOG_FILE', __DIR__ . '/logs/error.log');

// ============================================
// SURVEY QUESTIONS (EDIT DI SINI)
// ============================================

$SURVEY_QUESTIONS = [
    [
        'id' => 'u1',
        'text' => 'Bagaimana pendapat Saudara tentang kesesuaian persyaratan pelayanan dengan jenis pelayanannya?',
        'labels' => ['1' => 'Tidak Sesuai', '2' => 'Kurang Sesuai', '3' => 'Sesuai', '4' => 'Sangat Sesuai']
    ],
    [
        'id' => 'u2',
        'text' => 'Bagaimana pemahaman Saudara tentang kemudahan prosedur pelayanan di unit ini?',
        'labels' => ['1' => 'Tidak Mudah', '2' => 'Kurang Mudah', '3' => 'Mudah', '4' => 'Sangat Mudah']
    ],
    [
        'id' => 'u3',
        'text' => 'Bagaimana pendapat Saudara tentang kecepatan waktu dalam memberikan pelayanan?',
        'labels' => ['1' => 'Tidak Cepat', '2' => 'Kurang Cepat', '3' => 'Cepat', '4' => 'Sangat Cepat']
    ],
    [
        'id' => 'u4',
        'text' => 'Bagaimana pendapat Saudara tentang kewajaran biaya/tarif dalam pelayanan?',
        'labels' => ['1' => 'Sangat Mahal', '2' => 'Cukup Mahal', '3' => 'Murah', '4' => 'Gratis/Sangat Murah']
    ],
    [
        'id' => 'u5',
        'text' => 'Bagaimana pendapat Saudara tentang kesesuaian produk pelayanan antara yang tercantum dalam standar pelayanan dengan hasil yang diberikan?',
        'labels' => ['1' => 'Tidak Sesuai', '2' => 'Kurang Sesuai', '3' => 'Sesuai', '4' => 'Sangat Sesuai']
    ],
    [
        'id' => 'u6',
        'text' => 'Bagaimana pendapat Saudara tentang kompetensi/kemampuan petugas dalam pelayanan?',
        'labels' => ['1' => 'Tidak Kompeten', '2' => 'Kurang Kompeten', '3' => 'Kompeten', '4' => 'Sangat Kompeten']
    ],
    [
        'id' => 'u7',
        'text' => 'Bagaimana pendapat Saudara tentang perilaku petugas dalam pelayanan terkait kesopanan dan keramahan?',
        'labels' => ['1' => 'Tidak Sopan', '2' => 'Kurang Sopan', '3' => 'Sopan', '4' => 'Sangat Sopan']
    ],
    [
        'id' => 'u8',
        'text' => 'Bagaimana pendapat Saudara tentang kualitas sarana dan prasarana?',
        'labels' => ['1' => 'Buruk', '2' => 'Cukup', '3' => 'Baik', '4' => 'Sangat Baik']
    ],
    [
        'id' => 'u9',
        'text' => 'Bagaimana pendapat Saudara tentang penanganan pengaduan saran dan masukan?',
        'labels' => ['1' => 'Tidak Ada', '2' => 'Ada Tpi Kurang', '3' => 'Berfungsi', '4' => 'Dikelola Sangat Baik']
    ]
];

// ============================================
// EDUCATION OPTIONS (EDIT DI SINI)
// ============================================

$EDUCATION_OPTIONS = ['SD', 'SMP', 'SMA', 'D1/D2/D3', 'S1', 'S2/S3'];

// ============================================
// IKM GRADING SCALE (JANGAN DIUBAH)
// ============================================

$IKM_GRADES = [
    ['min' => 88.31, 'max' => 100, 'grade' => 'A', 'label' => 'Sangat Baik'],
    ['min' => 76.61, 'max' => 88.30, 'grade' => 'B', 'label' => 'Baik'],
    ['min' => 65.00, 'max' => 76.60, 'grade' => 'C', 'label' => 'Kurang Baik'],
    ['min' => 0, 'max' => 64.99, 'grade' => 'D', 'label' => 'Tidak Baik'],
];

// ============================================
// FUNCTION - IKM Calculator
// ============================================

function calculateIKMGrade($ikmValue) {
    global $IKM_GRADES;
    
    foreach ($IKM_GRADES as $grade) {
        if ($ikmValue >= $grade['min'] && $ikmValue <= $grade['max']) {
            return $grade['grade'] . ' (' . $grade['label'] . ')';
        }
    }
    
    return '-';
}

// ============================================
// FUNCTION - Database Connection
// ============================================

function getDBConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        die(json_encode([
            'success' => false,
            'message' => 'Database connection failed: ' . $conn->connect_error
        ]));
    }
    
    $conn->set_charset('utf8mb4');
    return $conn;
}

// ============================================
// FUNCTION - Logging
// ============================================

function logError($message, $context = []) {
    if (!ENABLE_ERROR_LOG) return;
    
    $logDir = dirname(LOG_FILE);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logMessage = date('Y-m-d H:i:s') . ' - ' . $message;
    if (!empty($context)) {
        $logMessage .= ' | ' . json_encode($context);
    }
    $logMessage .= "\n";
    
    file_put_contents(LOG_FILE, $logMessage, FILE_APPEND);
}

// ============================================
// FUNCTION - Response Helper
// ============================================

function sendResponse($success, $message = '', $data = null) {
    header('Content-Type: application/json');
    
    $response = [
        'success' => (bool) $success,
        'message' => $message,
        'data' => $data
    ];
    
    echo json_encode($response);
    exit;
}

?>
