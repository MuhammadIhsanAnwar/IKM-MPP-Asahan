<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Survei Kepuasan Masyarakat (IKM)</title>
    <link rel="stylesheet" href="../css/style.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js" onerror="console.error('Failed to load XLSX from CDN')"></script>
</head>
<body>
    <div id="app"></div>
    <script src="../js/shared.js"></script>
    <script src="../js/app-admin.js"></script>
    <script>
        // Check library loading
        window.addEventListener('load', function() {
            if (typeof XLSX === 'undefined') {
                console.warn('XLSX library not loaded, trying alternative...');
                // Try to load from alternative CDN
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
                script.onerror = function() {
                    console.error('Failed to load XLSX from all sources');
                };
                document.head.appendChild(script);
            }
        });
    </script>
</body>
</html>
