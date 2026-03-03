<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Statistik Survei IKM</title>
    <link rel="icon" type="image/png" href="../Logo/asahan.png">
    <link rel="shortcut icon" href="../Logo/asahan.png">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="stats-page">
        <header class="stats-header">
            <div class="container stats-header-wrap">
                <div>
                    <h1>Statistik Survei Kepuasan Masyarakat</h1>
                    <p>Persentase hasil survei berdasarkan 9 unsur, pendidikan responden, dan kategori jawaban.</p>
                </div>
                <nav class="stats-nav">
                    <a href="../index.php" class="stats-nav-btn">Halaman Utama</a>
                    <a href="../admin/admin.php" class="stats-nav-btn">Admin</a>
                </nav>
            </div>
        </header>

        <main class="container stats-main" id="statsApp">
            <section class="stats-filter-wrap" id="statsFilters">
                <label for="periodFilter" class="stats-filter-label">Periode Data</label>
                <select id="periodFilter" class="stats-filter-select">
                    <option value="all">Semua Data</option>
                    <option value="today">Hari Ini</option>
                    <option value="month">Bulan Ini</option>
                </select>
            </section>

            <section class="summary-grid" id="summaryCards"></section>

            <section class="stats-card" id="chart-unsur">
                <h2>Persentase Hasil Survei per Unsur (9 Unsur)</h2>
                <div class="chart-list" id="unsurChart"></div>
            </section>

            <section class="stats-card" id="chart-pendidikan">
                <h2>Persentase Pendidikan Responden</h2>
                <div class="chart-list" id="educationChart"></div>
            </section>

            <section class="stats-card" id="chart-kategori-jawaban">
                <h2>Persentase Kategori Jawaban</h2>
                <div class="chart-list" id="answerQualityChart"></div>
            </section>
        </main>
    </div>

    <script src="../js/shared.js"></script>
    <script src="app.js"></script>
</body>
</html>
