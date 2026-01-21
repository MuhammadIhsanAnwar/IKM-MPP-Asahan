// ============================================
// ADMIN APPLICATION STATE
// ============================================
const state = {
    view: 'admin_login',
    votes: [],
    loading: false,
    pinInput: '',
    showRespondenModal: false,
    sortBy: 'date',
    sortDirection: 'asc',
    stats: [],
    questionStats: [],
    globalStats: {},
    alert: null,
    isLoggedIn: false,
    inactivityTimer: null,
    inactivityTimeout: 5 * 60 * 1000,  // 5 menit
    loketSortBy: {},  // Tracking sort per loket: { loketId: 'gender|education|occupation|age|date' }
    loketSortDirection: {},  // Tracking sort direction per loket: { loketId: 'asc|desc' }
    loketSelectedRows: {},  // Tracking selected rows per loket: { loketId: [voteIds] }
    sortColorMap: {
        date: '#3b82f6',      // blue
        gender: '#8b5cf6',    // purple
        education: '#f59e0b', // amber
        occupation: '#10b981',// emerald
        age: '#ef4444'        // red
    }
};

// ============================================
// SESSION MANAGEMENT
// ============================================

function saveAdminSession() {
    try {
        localStorage.setItem('adminLoggedIn', JSON.stringify({
            loggedIn: true,
            timestamp: new Date().getTime()
        }));
    } catch (e) {
        console.warn('Failed to save admin session:', e);
    }
}

function loadAdminSession() {
    try {
        const session = localStorage.getItem('adminLoggedIn');
        if (session) {
            const data = JSON.parse(session);
            if (data.loggedIn) {
                return true;
            }
        }
    } catch (e) {
        console.warn('Failed to load admin session:', e);
    }
    return false;
}

function clearAdminSession() {
    try {
        localStorage.removeItem('adminLoggedIn');
        clearInactivityTimer();
    } catch (e) {
        console.warn('Failed to clear admin session:', e);
    }
}

function startInactivityTimer() {
    clearInactivityTimer();
    
    state.inactivityTimer = setTimeout(() => {
        clearAdminSession();
        state.view = 'admin_login';
        state.pinInput = '';
        state.isLoggedIn = false;
        showAlert('Sesi Anda telah habis karena tidak ada aktivitas selama 5 menit', 'error');
        render();
    }, state.inactivityTimeout);
}

function clearInactivityTimer() {
    if (state.inactivityTimer) {
        clearTimeout(state.inactivityTimer);
        state.inactivityTimer = null;
    }
}

function resetInactivityTimer() {
    if (state.isLoggedIn) {
        startInactivityTimer();
    }
}

// ============================================
// API FUNCTIONS
// ============================================

async function apiCall(action, data = {}) {
    try {
        const response = await fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, ...data })
        });

        const result = await response.json();
        
        if (!result.success) {
            showAlert(result.message || 'Terjadi kesalahan', 'error');
            return null;
        }

        return result.data;
    } catch (error) {
        console.error('API Error:', error);
        showAlert('Gagal terhubung ke server', 'error');
        return null;
    }
}

async function loadVotes() {
    state.loading = true;
    render();

    const result = await apiCall('getVotes');
    
    if (result) {
        state.votes = result;
        calculateStats();
        state.loading = false;
        render();
    }
}

async function deleteSelectedLoketData(loketId) {
    const selectedIds = state.loketSelectedRows[loketId] || [];
    if (selectedIds.length === 0) {
        showAlert('Pilih minimal 1 data untuk dihapus', 'warning');
        return;
    }

    const confirmed = confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} data survei dari Loket ${loketId}? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    state.loading = true;
    render();

    try {
        const data = await apiCall('deleteVotesByIds', { voteIds: selectedIds });
        
        if (data) {
            state.votes = state.votes.filter(v => !selectedIds.includes(v.id));
            state.loketSelectedRows[loketId] = [];
            calculateStats();
            state.loading = false;
            showAlert(`${data.deletedCount} data berhasil dihapus`, 'success');
            render();
        } else {
            throw new Error('Gagal menghapus data');
        }
    } catch (error) {
        state.loading = false;
        showAlert('Gagal menghapus data: ' + error.message, 'error');
        render();
    }
}

async function deleteAllVotes() {
    const confirmed = confirm('Apakah Anda yakin ingin menghapus SEMUA data survei? Tindakan ini tidak dapat dibatalkan.');
    if (!confirmed) return;

    state.loading = true;
    render();

    const result = await apiCall('deleteAllVotes');
    
    if (result) {
        state.votes = [];
        calculateStats();
        state.loading = false;
        showAlert('Semua data berhasil dihapus', 'success');
        render();
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

function exportToExcel() {
    // Check if XLSX library is loaded
    if (typeof XLSX === 'undefined') {
        showAlert('Library Excel sedang dimuat, silahkan tunggu...', 'error');
        
        // Wait and retry
        let retries = 0;
        const checkInterval = setInterval(() => {
            retries++;
            if (typeof XLSX !== 'undefined') {
                clearInterval(checkInterval);
                exportToExcel();
            } else if (retries >= 10) {
                clearInterval(checkInterval);
                showAlert('Gagal memuat library Excel. Cek koneksi internet Anda.', 'error');
            }
        }, 500);
        return;
    }

    try {
        const now = new Date();
        const timestamp = now.toLocaleDateString('id-ID').replace(/\//g, '-');
        const filename = `Laporan_IKM_${timestamp}.xlsx`;
        
        // Create workbook dan worksheets
        const wb = XLSX.utils.book_new();
        
        // ===== SHEET 1: STATISTIK KESELURUHAN =====
        const summaryData = [
            ['LAPORAN INDEKS KEPUASAN MASYARAKAT (IKM)'],
            [],
            ['STATISTIK KESELURUHAN'],
            [],
            ['Total Responden', state.globalStats.totalVotes || 0],
            ['Nilai IKM Keseluruhan', (state.globalStats.ikmValue || 0).toFixed(2)],
            ['Mutu Keseluruhan', state.globalStats.mutu || '-'],
        ];
        const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
        summaryWs['!cols'] = [{ wch: 25 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Ringkasan');
        
        // ===== SHEET 2: RINGKASAN PER LOKET =====
        const loketData = [['Loket', 'Nama Loket', 'Jumlah Responden', 'Nilai IKM', 'Mutu Pelayanan']];
        getLoketStats().forEach(loket => {
            loketData.push([
                loket.loketId,
                getLoketName(loket.loketId),
                loket.totalVotes,
                loket.totalVotes > 0 ? loket.ikmValue.toFixed(2) : '-',
                loket.mutu
            ]);
        });
        const loketWs = XLSX.utils.aoa_to_sheet(loketData);
        loketWs['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 18 }];
        
        // Styling header row untuk Loket sheet
        for (let i = 0; i < 5; i++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
            loketWs[cellRef].s = {
                fill: { fgColor: { rgb: '1e40af' } },
                font: { color: { rgb: 'FFFFFF' }, bold: true },
                alignment: { horizontal: 'center', vertical: 'center' }
            };
        }
        
        XLSX.utils.book_append_sheet(wb, loketWs, 'Per Loket');
        
        // ===== SHEET 3: DATA RESPONDEN DETAIL =====
        const responderData = [['No', 'Tanggal', 'Loket', 'Nama Loket', 'Jenis Kelamin', 'Pendidikan', 'Pekerjaan', 'Umur', 'U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'Nilai IKM']];
        
        state.votes.forEach((vote, idx) => {
            const respondent = vote.respondent || {};
            const genderMap = { 'L': 'Laki-laki', 'P': 'Perempuan' };
            const date = vote.created_at ? new Date(vote.created_at).toLocaleDateString('id-ID') : '-';
            const loketName = getLoketName(vote.loket_id);
            const answers = vote.answers || {};
            const ikm = vote.rating ? (vote.rating * 25).toFixed(2) : '-';
            
            const row = [
                idx + 1,
                date,
                vote.loket_id,
                loketName,
                genderMap[respondent.gender] || respondent.gender || '-',
                respondent.education || '-',
                respondent.occupation || '-',
                respondent.age || '-',
                answers[SURVEY_QUESTIONS[0].id] || '-',
                answers[SURVEY_QUESTIONS[1].id] || '-',
                answers[SURVEY_QUESTIONS[2].id] || '-',
                answers[SURVEY_QUESTIONS[3].id] || '-',
                answers[SURVEY_QUESTIONS[4].id] || '-',
                answers[SURVEY_QUESTIONS[5].id] || '-',
                answers[SURVEY_QUESTIONS[6].id] || '-',
                answers[SURVEY_QUESTIONS[7].id] || '-',
                answers[SURVEY_QUESTIONS[8].id] || '-',
                ikm
            ];
            responderData.push(row);
        });
        
        const responderWs = XLSX.utils.aoa_to_sheet(responderData);
        responderWs['!cols'] = [
            { wch: 5 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 15 },
            { wch: 15 }, { wch: 18 }, { wch: 8 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 },
            { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 12 }
        ];
        
        // Styling header row untuk Responden sheet
        for (let i = 0; i < responderData[0].length; i++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
            responderWs[cellRef].s = {
                fill: { fgColor: { rgb: '1e40af' } },
                font: { color: { rgb: 'FFFFFF' }, bold: true },
                alignment: { horizontal: 'center', vertical: 'center' }
            };
        }
        
        // Alternate row colors
        for (let i = 1; i < responderData.length; i++) {
            for (let j = 0; j < responderData[0].length; j++) {
                const cellRef = XLSX.utils.encode_cell({ r: i, c: j });
                responderWs[cellRef].s = {
                    fill: { fgColor: { rgb: i % 2 === 0 ? 'FFFFFF' : 'F3F4F6' } },
                    alignment: { horizontal: 'center', vertical: 'center' }
                };
            }
        }
        
        XLSX.utils.book_append_sheet(wb, responderWs, 'Responden');
        
        // Save file
        XLSX.writeFile(wb, filename);
        showAlert('File Excel berhasil diunduh: ' + filename, 'success');
    } catch (error) {
        console.error('Export Excel Error:', error);
        showAlert('Gagal membuat file Excel: ' + error.message, 'error');
    }
}

function exportToPDF() {
    const now = new Date();
    const timestamp = now.toLocaleDateString('id-ID').replace(/\//g, '-');
    const filename = `Laporan_IKM_${timestamp}.pdf`;
    
    let html = `
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; font-size: 10px; margin: 10px; }
                    h1 { text-align: center; color: #1e40af; font-size: 16px; margin-bottom: 5px; }
                    h2 { color: #1e40af; font-size: 12px; margin-top: 15px; margin-bottom: 10px; border-bottom: 2px solid #1e40af; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                    th { background-color: #1e40af; color: white; padding: 6px; text-align: left; font-weight: bold; }
                    td { padding: 5px; border-bottom: 1px solid #ddd; }
                    tr:nth-child(even) { background-color: #f9fafb; }
                    .stats { margin: 10px 0; }
                    .stat-item { margin: 5px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 9px; }
                    page-break-after: always;
                </style>
            </head>
            <body>
                <h1>LAPORAN INDEKS KEPUASAN MASYARAKAT (IKM)</h1>
                <div style="text-align: center; margin-bottom: 10px; font-size: 9px;">
                    Tanggal: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                
                <h2>STATISTIK KESELURUHAN</h2>
                <div class="stats">
                    <div class="stat-item"><strong>Total Responden:</strong> ${state.globalStats.totalVotes || 0}</div>
                    <div class="stat-item"><strong>Nilai IKM Keseluruhan:</strong> ${(state.globalStats.ikmValue || 0).toFixed(2)}</div>
                    <div class="stat-item"><strong>Mutu Keseluruhan:</strong> ${state.globalStats.mutu || '-'}</div>
                </div>
                
                <h2>RINGKASAN MUTU PELAYANAN PER LOKET</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Loket</th>
                            <th>Nama Loket</th>
                            <th>Responden</th>
                            <th>Nilai IKM</th>
                            <th>Mutu</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${getLoketStats().map(loket => `
                            <tr>
                                <td>${loket.loketId}</td>
                                <td>${getLoketName(loket.loketId)}</td>
                                <td>${loket.totalVotes}</td>
                                <td>${loket.totalVotes > 0 ? loket.ikmValue.toFixed(2) : '-'}</td>
                                <td>${loket.mutu}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h2>DATA RESPONDEN DETAIL</h2>
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Tanggal</th>
                            <th>Loket</th>
                            <th>Jenis Kelamin</th>
                            <th>Pendidikan</th>
                            <th>Umur</th>
                            <th>Nilai IKM</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.votes.map((vote, idx) => {
                            const genderMap = { 'L': 'Laki-laki', 'P': 'Perempuan' };
                            const respondent = vote.respondent || {};
                            const date = vote.created_at ? new Date(vote.created_at).toLocaleDateString('id-ID') : '-';
                            return `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td>${date}</td>
                                    <td>${vote.loket_id}</td>
                                    <td>${genderMap[respondent.gender] || respondent.gender || '-'}</td>
                                    <td>${respondent.education || '-'}</td>
                                    <td>${respondent.age || '-'}</td>
                                    <td>${vote.rating ? (vote.rating * 25).toFixed(2) : '-'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>Sesuai Permenpan RB No. 14 Tahun 2017</p>
                    <p>© ${new Date().getFullYear()} Unit Pelayanan Publik Terpadu</p>
                </div>
            </body>
        </html>
    `;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
    
    showAlert('File PDF siap untuk diunduh', 'success');
}

// ============================================
// STATE MANAGEMENT
// ============================================

function showAlert(message, type = 'info') {
    state.alert = { message, type };
    render();
    
    if (type !== 'error') {
        setTimeout(() => {
            state.alert = null;
            render();
        }, 4000);
    }
}

function handleLogin(e) {
    e.preventDefault();
    if (state.pinInput === ADMIN_PIN) {
        state.view = 'admin_dashboard';
        state.pinInput = '';
        state.isLoggedIn = true;
        saveAdminSession();
        startInactivityTimer();
        loadVotes();
    } else {
        showAlert('PIN Salah!', 'error');
        state.pinInput = '';
        render();
    }
}

function calculateStats() {
    state.questionStats = Array.from({ length: 9 }, (_, qIdx) => {
        return Array.from({ length: TOTAL_LOKET }, (_, lIdx) => ({
            loketId: lIdx + 1,
            questionIdx: qIdx,
            counts: { 1: 0, 2: 0, 3: 0, 4: 0 },
            total: 0
        }));
    });

    state.votes.forEach(vote => {
        const loketIdx = vote.loket_id - 1;
        if (vote.answers) {
            SURVEY_QUESTIONS.forEach((q, qIdx) => {
                const answer = vote.answers[q.id];
                if (answer && state.questionStats[qIdx][loketIdx]) {
                    state.questionStats[qIdx][loketIdx].counts[answer]++;
                    state.questionStats[qIdx][loketIdx].total++;
                }
            });
        }
    });

    const totalVotes = state.votes.length;
    const sumRating = state.votes.reduce((acc, curr) => acc + (curr.rating || 0), 0);
    const avg = totalVotes > 0 ? sumRating / totalVotes : 0;
    const ikmValue = avg * 25;

    let mutu = '-';
    if (totalVotes > 0) {
        if (ikmValue >= 88.31) mutu = 'A (Sangat Baik)';
        else if (ikmValue >= 76.61) mutu = 'B (Baik)';
        else if (ikmValue >= 65) mutu = 'C (Kurang Baik)';
        else mutu = 'D (Tidak Baik)';
    }

    state.globalStats = { totalVotes, ikmValue, mutu };
}

function getLoketStats() {
    const loketStats = Array.from({ length: TOTAL_LOKET }, (_, i) => {
        const loketId = i + 1;
        const loketVotes = state.votes.filter(v => v.loket_id === loketId);
        
        if (loketVotes.length === 0) {
            return {
                loketId,
                totalVotes: 0,
                ikmValue: 0,
                mutu: '-',
                avgRating: 0
            };
        }
        
        const sumRating = loketVotes.reduce((acc, v) => acc + (v.rating || 0), 0);
        const avgRating = sumRating / loketVotes.length;
        const ikmValue = avgRating * 25;
        
        let mutu = '-';
        if (ikmValue >= 88.31) mutu = 'A (Sangat Baik)';
        else if (ikmValue >= 76.61) mutu = 'B (Baik)';
        else if (ikmValue >= 65) mutu = 'C (Kurang Baik)';
        else mutu = 'D (Tidak Baik)';
        
        return {
            loketId,
            totalVotes: loketVotes.length,
            ikmValue,
            mutu,
            avgRating
        };
    });
    
    return loketStats;
}

function getSortedVotes(votes) {
    const sorted = [...votes];
    
    sorted.sort((a, b) => {
        let aVal, bVal;
        
        switch(state.sortBy) {
            case 'date':
                aVal = new Date(a.created_at || 0);
                bVal = new Date(b.created_at || 0);
                break;
            case 'gender':
                aVal = (a.respondent?.gender || '').toString();
                bVal = (b.respondent?.gender || '').toString();
                break;
            case 'education':
                aVal = (a.respondent?.education || '').toString();
                bVal = (b.respondent?.education || '').toString();
                break;
            case 'occupation':
                aVal = (a.respondent?.occupation || '').toString();
                bVal = (b.respondent?.occupation || '').toString();
                break;
            case 'age':
                aVal = parseInt(a.respondent?.age || 0);
                bVal = parseInt(b.respondent?.age || 0);
                break;
            default:
                return 0;
        }
        
        if (aVal < bVal) return state.sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return state.sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    return sorted;
}

function getSortedLoketVotes(votes, loketId) {
    const sorted = [...votes];
    const sortBy = state.loketSortBy[loketId] || 'date';
    const sortDir = state.loketSortDirection[loketId] || 'asc';
    
    sorted.sort((a, b) => {
        let aVal, bVal;
        
        switch(sortBy) {
            case 'date':
                aVal = new Date(a.created_at || 0);
                bVal = new Date(b.created_at || 0);
                break;
            case 'gender':
                aVal = (a.respondent?.gender || '').toString();
                bVal = (b.respondent?.gender || '').toString();
                break;
            case 'education':
                aVal = (a.respondent?.education || '').toString();
                bVal = (b.respondent?.education || '').toString();
                break;
            case 'occupation':
                aVal = (a.respondent?.occupation || '').toString();
                bVal = (b.respondent?.occupation || '').toString();
                break;
            case 'age':
                aVal = parseInt(a.respondent?.age || 0);
                bVal = parseInt(b.respondent?.age || 0);
                break;
            default:
                return 0;
        }
        
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
    
    return sorted;
}

function handleLoketSort(loketId, sortBy) {
    if (state.loketSortBy[loketId] === sortBy) {
        // Toggle direction jika sort field sama
        state.loketSortDirection[loketId] = state.loketSortDirection[loketId] === 'asc' ? 'desc' : 'asc';
    } else {
        // Set sort field baru dengan asc default
        state.loketSortBy[loketId] = sortBy;
        state.loketSortDirection[loketId] = 'asc';
    }
    render();
}

function handleSort(sortBy) {
    if (state.sortBy === sortBy) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortBy = sortBy;
        state.sortDirection = 'asc';
    }
    render();
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderAlert() {
    if (!state.alert) return '';
    return `
        <div class="alert ${state.alert.type}">
            ${state.alert.message}
        </div>
    `;
}

function renderAdminLogin() {
    return `
        <div class="min-h-screen flex-center bg-gray-100">
            <div class="card max-w-sm w-full animate-slide-up" style="max-width: 380px;">
                ${renderAlert()}
                <div class="flex-center gap-4 mb-6">
                    <div style="background-color: #dbeafe; padding: 1rem; border-radius: 9999px;">
                        ${SVGIcon('logIn', 32)}
                    </div>
                </div>
                <h2 class="text-2xl font-bold text-center mb-6">Login Admin</h2>
                <form id="loginForm" class="space-y-4">
                    <div class="form-group">
                        <input 
                            type="password" 
                            id="pinInput"
                            value="${state.pinInput}"
                            placeholder="Masukkan PIN Admin"
                            autofocus
                        />
                    </div>
                    <button type="submit" class="btn btn-primary btn-lg w-full">Masuk</button>
                    <button type="button" id="backBtn" class="btn btn-ghost w-full">Kembali</button>
                </form>
            </div>
        </div>
    `;
}

function renderAdminDashboard() {
    if (state.loading) {
        return `
            <div class="min-h-screen flex-center">
                <div class="loading">
                    <div class="spinner"></div>
                    <span>Memuat data...</span>
                </div>
            </div>
        `;
    }

    if (state.showRespondenModal) {
        return `
            <div class="min-h-screen flex-col" style="background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; padding: 2rem;">
                <div class="card" style="max-width: 900px; margin: auto; width: 100%; max-height: 80vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--gray-200);">
                        <h2 class="text-xl font-bold">Data Responden (${state.votes.length})</h2>
                        <button id="closeRespondenModal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">×</button>
                    </div>

                    <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                        <button class="sort-btn ${state.sortBy === 'date' ? 'active' : ''}" data-sort="date" style="padding: 0.5rem 1rem; border: 1px solid var(--gray-300); border-radius: 0.5rem; cursor: pointer; background: ${state.sortBy === 'date' ? 'var(--primary)' : 'white'}; color: ${state.sortBy === 'date' ? 'white' : 'var(--gray-700)'};">
                            Tanggal ${state.sortBy === 'date' ? (state.sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                        <button class="sort-btn ${state.sortBy === 'gender' ? 'active' : ''}" data-sort="gender" style="padding: 0.5rem 1rem; border: 1px solid var(--gray-300); border-radius: 0.5rem; cursor: pointer; background: ${state.sortBy === 'gender' ? 'var(--primary)' : 'white'}; color: ${state.sortBy === 'gender' ? 'white' : 'var(--gray-700)'};">
                            Jenis Kelamin ${state.sortBy === 'gender' ? (state.sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                        <button class="sort-btn ${state.sortBy === 'education' ? 'active' : ''}" data-sort="education" style="padding: 0.5rem 1rem; border: 1px solid var(--gray-300); border-radius: 0.5rem; cursor: pointer; background: ${state.sortBy === 'education' ? 'var(--primary)' : 'white'}; color: ${state.sortBy === 'education' ? 'white' : 'var(--gray-700)'};">
                            Pendidikan ${state.sortBy === 'education' ? (state.sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                        <button class="sort-btn ${state.sortBy === 'occupation' ? 'active' : ''}" data-sort="occupation" style="padding: 0.5rem 1rem; border: 1px solid var(--gray-300); border-radius: 0.5rem; cursor: pointer; background: ${state.sortBy === 'occupation' ? 'var(--primary)' : 'white'}; color: ${state.sortBy === 'occupation' ? 'white' : 'var(--gray-700)'};">
                            Pekerjaan ${state.sortBy === 'occupation' ? (state.sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                    </div>

                    <div class="table-wrapper">
                        <table style="font-size: 0.9rem;">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Tanggal Kirim</th>
                                    <th>Loket</th>
                                    <th>Jenis Kelamin</th>
                                    <th>Pendidikan</th>
                                    <th>Pekerjaan</th>
                                    <th>Umur</th>
                                    <th>Nilai IKM</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${getSortedVotes(state.votes).map((vote, idx) => {
                                    const genderMap = { 'L': 'Laki-laki', 'P': 'Perempuan' };
                                    const respondent = vote.respondent || {};
                                    const date = vote.created_at ? new Date(vote.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';
                                    const time = vote.created_at ? new Date(vote.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
                                    return `
                                        <tr>
                                            <td>${idx + 1}</td>
                                            <td>${date} ${time}</td>
                                            <td><strong>${vote.loket_id}</strong></td>
                                            <td>${genderMap[respondent.gender] || respondent.gender || '-'}</td>
                                            <td>${respondent.education || '-'}</td>
                                            <td>${respondent.occupation || '-'}</td>
                                            <td>${respondent.age ? respondent.age + ' tahun' : '-'}</td>
                                            <td><strong style="color: var(--primary);">${vote.rating ? (vote.rating * 25).toFixed(2) : '-'}</strong></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div style="margin-top: 1rem; text-align: center;">
                        <button id="closeRespondenModal2" class="btn btn-secondary">Tutup</button>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="min-h-screen flex-col">
            <div class="card shadow-xl mb-0">
                <div class="dashboard-header">
                    <div>
                        <h1>Laporan IKM</h1>
                        <p>Rekapitulasi Indeks Kepuasan Masyarakat</p>
                    </div>
                    <div class="dashboard-buttons">
                        <button id="excelBtn" class="btn btn-primary">
                            ${SVGIcon('download', 18)} Export Excel
                        </button>
                        <button id="pdfBtn" class="btn btn-primary">
                            ${SVGIcon('download', 18)} Export PDF
                        </button>
                        <button id="resetBtn" class="btn btn-danger" ${state.loading ? 'disabled' : ''}>
                            ${SVGIcon('trash', 18)} Reset Data
                        </button>
                        <button id="logoutBtn" class="btn btn-secondary">
                            ${SVGIcon('logOut', 18)} Keluar
                        </button>
                    </div>
                </div>

                <div class="p-6">
                    ${renderAlert()}
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>Total Responden</h3>
                            <p>${state.globalStats.totalVotes || 0}</p>
                        </div>
                        <div class="stat-card success">
                            <h3>Nilai IKM Keseluruhan</h3>
                            <p>${(state.globalStats.ikmValue || 0).toFixed(2)}</p>
                        </div>
                        <div class="stat-card warning">
                            <h3>Mutu Keseluruhan</h3>
                            <p>${state.globalStats.mutu || '-'}</p>
                        </div>
                    </div>

                    <div style="background: #f8fafc; border: 1px solid var(--gray-200); border-radius: 8px; padding: 2rem; margin-bottom: 2rem;">
                        <h3 style="margin-top: 0; margin-bottom: 1.5rem; color: var(--primary); font-weight: bold;">LEGENDA UNSUR (U1-U9)</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem;">
                            <div>
                                <p style="margin: 0.5rem 0; color: var(--primary); font-weight: bold;">U1: PERSYARATAN</p>
                                <p style="margin: 0.5rem 0; color: var(--primary); font-weight: bold;">U2: PROSEDUR</p>
                                <p style="margin: 0.5rem 0; color: var(--primary); font-weight: bold;">U3: WAKTU PELAYANAN</p>
                            </div>
                            <div>
                                <p style="margin: 0.5rem 0; color: var(--primary); font-weight: bold;">U4: BIAYA/TARIF</p>
                                <p style="margin: 0.5rem 0; color: var(--primary); font-weight: bold;">U5: PRODUK SPESIFIKASI</p>
                                <p style="margin: 0.5rem 0; color: var(--primary); font-weight: bold;">U6: KOMPETENSI PELAKSANA</p>
                            </div>
                            <div>
                                <p style="margin: 0.5rem 0; color: var(--primary); font-weight: bold;">U7: PERILAKU PELAKSANA</p>
                                <p style="margin: 0.5rem 0; color: var(--primary); font-weight: bold;">U8: SARANA & PRASARANA</p>
                                <p style="margin: 0.5rem 0; color: var(--primary); font-weight: bold;">U9: PENANGANAN PENGADUAN</p>
                            </div>
                        </div>
                    </div>

                    ${Array.from({ length: TOTAL_LOKET }, (_, loketIdx) => {
                        const loketId = loketIdx + 1;
                        const loketVotes = getSortedLoketVotes(state.votes.filter(v => v.loket_id === loketId), loketId);
                        
                        return `
                            <div class="mb-8">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                    <h3 style="margin: 0; padding-bottom: 0.5rem; border-bottom: 2px solid var(--primary); color: var(--primary); flex: 1;">
                                        Loket ${loketId} - ${getLoketName(loketId)} (${loketVotes.length} Responden)
                                    </h3>
                                </div>
                                
                                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;">
                                    <button class="loket-sort-btn" data-loket="${loketId}" data-sort="date" style="padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; background: ${state.loketSortBy[loketId] === 'date' ? state.sortColorMap.date : '#e5e7eb'}; color: ${state.loketSortBy[loketId] === 'date' ? 'white' : '#6b7280'}; font-weight: bold; display: flex; align-items: center; gap: 0.5rem;">
                                        📅 Tanggal ${state.loketSortBy[loketId] === 'date' ? (state.loketSortDirection[loketId] === 'asc' ? '↑' : '↓') : ''}
                                    </button>
                                    <button class="loket-sort-btn" data-loket="${loketId}" data-sort="gender" style="padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; background: ${state.loketSortBy[loketId] === 'gender' ? state.sortColorMap.gender : '#e5e7eb'}; color: ${state.loketSortBy[loketId] === 'gender' ? 'white' : '#6b7280'}; font-weight: bold; display: flex; align-items: center; gap: 0.5rem;">
                                        👥 Kelamin ${state.loketSortBy[loketId] === 'gender' ? (state.loketSortDirection[loketId] === 'asc' ? '↑' : '↓') : ''}
                                    </button>
                                    <button class="loket-sort-btn" data-loket="${loketId}" data-sort="education" style="padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; background: ${state.loketSortBy[loketId] === 'education' ? state.sortColorMap.education : '#e5e7eb'}; color: ${state.loketSortBy[loketId] === 'education' ? 'white' : '#6b7280'}; font-weight: bold; display: flex; align-items: center; gap: 0.5rem;">
                                        🎓 Pendidikan ${state.loketSortBy[loketId] === 'education' ? (state.loketSortDirection[loketId] === 'asc' ? '↑' : '↓') : ''}
                                    </button>
                                    <button class="loket-sort-btn" data-loket="${loketId}" data-sort="occupation" style="padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; background: ${state.loketSortBy[loketId] === 'occupation' ? state.sortColorMap.occupation : '#e5e7eb'}; color: ${state.loketSortBy[loketId] === 'occupation' ? 'white' : '#6b7280'}; font-weight: bold; display: flex; align-items: center; gap: 0.5rem;">
                                        💼 Pekerjaan ${state.loketSortBy[loketId] === 'occupation' ? (state.loketSortDirection[loketId] === 'asc' ? '↑' : '↓') : ''}
                                    </button>
                                    <button class="loket-sort-btn" data-loket="${loketId}" data-sort="age" style="padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; background: ${state.loketSortBy[loketId] === 'age' ? state.sortColorMap.age : '#e5e7eb'}; color: ${state.loketSortBy[loketId] === 'age' ? 'white' : '#6b7280'}; font-weight: bold; display: flex; align-items: center; gap: 0.5rem;">
                                        🎂 Usia ${state.loketSortBy[loketId] === 'age' ? (state.loketSortDirection[loketId] === 'asc' ? '↑' : '↓') : ''}
                                    </button>
                                    <button class="loket-delete-btn" data-loket="${loketId}" style="padding: 0.5rem 1rem; border: none; border-radius: 0.5rem; cursor: pointer; background: #dc2626; color: white; font-weight: bold; display: flex; align-items: center; gap: 0.5rem; margin-left: auto;">
                                        🗑️ Hapus (${(state.loketSelectedRows[loketId] || []).length})
                                    </button>
                                </div>
                                
                                <div class="table-wrapper">
                                    <table style="font-size: 0.85rem;">
                                        <thead>
                                            <tr>
                                                <th><input type="checkbox" class="select-all-loket" data-loket="${loketId}" style="cursor: pointer;"></th>
                                                <th>No</th>
                                                <th>Tanggal</th>
                                                <th>Jenis Kelamin</th>
                                                <th>Pendidikan</th>
                                                <th>Pekerjaan</th>
                                                <th>Usia</th>
                                                <th>U1</th>
                                                <th>U2</th>
                                                <th>U3</th>
                                                <th>U4</th>
                                                <th>U5</th>
                                                <th>U6</th>
                                                <th>U7</th>
                                                <th>U8</th>
                                                <th>U9</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${loketVotes.length === 0 ? `
                                                <tr>
                                                    <td colspan="15" style="text-align: center; color: #999; padding: 2rem;">Belum ada data</td>
                                                </tr>
                                            ` : `
                                                ${loketVotes.map((vote, idx) => {
                                                    const respondent = vote.respondent || {};
                                                    const genderMap = { 'L': 'Laki-laki', 'P': 'Perempuan' };
                                                    const date = vote.created_at ? new Date(vote.created_at).toLocaleDateString('id-ID') : '-';
                                                    const time = vote.created_at ? new Date(vote.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
                                                    const answers = vote.answers || {};
                                                    const isSelected = (state.loketSelectedRows[loketId] || []).includes(vote.id);
                                                    return `
                                                        <tr style="${isSelected ? 'background-color: rgba(59, 130, 246, 0.1);' : ''}">
                                                            <td style="width: 40px; text-align: center;"><input type="checkbox" class="select-row-loket" data-loket="${loketId}" data-vote-id="${vote.id}" ${isSelected ? 'checked' : ''} style="cursor: pointer;"></td>
                                                            <td><strong>${idx + 1}</strong></td>
                                                            <td>${date} ${time}</td>
                                                            <td>${genderMap[respondent.gender] || respondent.gender || '-'}</td>
                                                            <td>${respondent.education || '-'}</td>
                                                            <td>${respondent.occupation || '-'}</td>
                                                            <td>${respondent.age || '-'}</td>
                                                            ${SURVEY_QUESTIONS.map(q => `<td style="text-align: center; font-weight: bold;">${answers[q.id] || '-'}</td>`).join('')}
                                                        </tr>
                                                    `;
                                                }).join('')}
                                                
                                                <tr style="background-color: var(--gray-100); font-weight: bold;">
                                                    <td colspan="7" style="text-align: right;">Jumlah:</td>
                                                    ${SURVEY_QUESTIONS.map((q, qIdx) => {
                                                        const total = loketVotes.reduce((acc, vote) => {
                                                            const val = vote.answers?.[q.id];
                                                            return acc + (val || 0);
                                                        }, 0);
                                                        return `<td style="text-align: center;">${total}</td>`;
                                                    }).join('')}
                                                </tr>
                                                
                                                <tr style="background-color: var(--gray-100); font-weight: bold; color: var(--primary);">
                                                    <td colspan="6" style="text-align: right;">Rata-rata & Mutu:</td>
                                                    <td colspan="${SURVEY_QUESTIONS.length}" style="text-align: left;">
                                                        Nilai IKM: ${loketVotes.length > 0 ? (() => {
                                                            const sumRating = loketVotes.reduce((acc, v) => acc + (v.rating || 0), 0);
                                                            const avg = sumRating / loketVotes.length;
                                                            const ikmValue = avg * 25;
                                                            return ikmValue.toFixed(2);
                                                        })() : '-'} | 
                                                        Mutu: ${loketVotes.length > 0 ? (() => {
                                                            const sumRating = loketVotes.reduce((acc, v) => acc + (v.rating || 0), 0);
                                                            const avg = sumRating / loketVotes.length;
                                                            const ikmValue = avg * 25;
                                                            if (ikmValue >= 88.31) return 'A (Sangat Baik)';
                                                            else if (ikmValue >= 76.61) return 'B (Baik)';
                                                            else if (ikmValue >= 65) return 'C (Kurang Baik)';
                                                            else return 'D (Tidak Baik)';
                                                        })() : '-'}
                                                    </td>
                                                </tr>
                                            `}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        `;
                    }).join('')}

                    <div class="mb-8">
                        <h3 style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--primary); color: var(--primary); margin-top: 2rem;">
                            Ringkasan Mutu Pelayanan Per Loket
                        </h3>
                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Loket</th>
                                        <th>Nama Loket</th>
                                        <th>Jumlah Responden</th>
                                        <th>Nilai IKM</th>
                                        <th>Mutu Pelayanan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${getLoketStats().map(loket => `
                                        <tr>
                                            <td><strong>${loket.loketId}</strong></td>
                                            <td>${getLoketName(loket.loketId)}</td>
                                            <td>${loket.totalVotes}</td>
                                            <td><strong style="color: var(--primary);">${loket.totalVotes > 0 ? loket.ikmValue.toFixed(2) : '-'}</strong></td>
                                            <td style="font-weight: bold; color: ${loket.mutu === 'A (Sangat Baik)' ? '#27ae60' : loket.mutu === 'B (Baik)' ? '#3498db' : loket.mutu === 'C (Kurang Baik)' ? '#f39c12' : '#e74c3c'};">${loket.mutu}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function render() {
    const app = document.getElementById('app');

    switch (state.view) {
        case 'admin_dashboard':
            app.innerHTML = renderAdminDashboard();
            if (!state.loading) {
                attachAdminDashboardListeners();
            }
            break;
        case 'admin_login':
        default:
            app.innerHTML = renderAdminLogin();
            attachAdminLoginListeners();
            break;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function attachAdminLoginListeners() {
    const form = document.getElementById('loginForm');
    const pinInput = document.getElementById('pinInput');

    pinInput.addEventListener('change', (e) => {
        state.pinInput = e.target.value;
    });

    form.addEventListener('submit', handleLogin);

    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = '../index.php';
    });
}

function attachAdminDashboardListeners() {
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    const excelBtn = document.getElementById('excelBtn');
    if (excelBtn) {
        excelBtn.addEventListener('click', exportToExcel);
    }

    const pdfBtn = document.getElementById('pdfBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', exportToPDF);
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', deleteAllVotes);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            clearAdminSession();
            state.isLoggedIn = false;
            window.location.href = '../index.php';
        });
    }

    const statsCards = document.querySelectorAll('.stat-card');
    if (statsCards.length > 0) {
        statsCards[0].style.cursor = 'pointer';
        statsCards[0].addEventListener('click', () => {
            state.showRespondenModal = true;
            resetInactivityTimer();
            render();
        });
    }

    const closeBtn1 = document.getElementById('closeRespondenModal');
    const closeBtn2 = document.getElementById('closeRespondenModal2');
    
    if (closeBtn1) {
        closeBtn1.addEventListener('click', () => {
            state.showRespondenModal = false;
            resetInactivityTimer();
            render();
        });
    }
    
    if (closeBtn2) {
        closeBtn2.addEventListener('click', () => {
            state.showRespondenModal = false;
            resetInactivityTimer();
            render();
        });
    }

    // Event listeners untuk sorting buttons
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const sortBy = btn.getAttribute('data-sort');
            handleSort(sortBy);
        });
    });

    // Event listeners untuk loket sorting buttons
    const loketSortButtons = document.querySelectorAll('.loket-sort-btn');
    loketSortButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const loketId = parseInt(btn.getAttribute('data-loket'));
            const sortBy = btn.getAttribute('data-sort');
            handleLoketSort(loketId, sortBy);
        });
    });

    // Event listeners untuk checkbox selection
    const selectAllCheckboxes = document.querySelectorAll('.select-all-loket');
    selectAllCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const loketId = parseInt(e.target.getAttribute('data-loket'));
            const isChecked = e.target.checked;
            const loketVotes = state.votes.filter(v => v.loket_id === loketId);
            
            if (isChecked) {
                // Select all votes in this loket
                state.loketSelectedRows[loketId] = loketVotes.map(v => v.id);
            } else {
                // Deselect all votes in this loket
                state.loketSelectedRows[loketId] = [];
            }
            
            render();
        });
    });

    const selectRowCheckboxes = document.querySelectorAll('.select-row-loket');
    selectRowCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const loketId = parseInt(e.target.getAttribute('data-loket'));
            const voteId = parseInt(e.target.getAttribute('data-vote-id'));
            
            if (!state.loketSelectedRows[loketId]) {
                state.loketSelectedRows[loketId] = [];
            }
            
            if (e.target.checked) {
                // Add vote ID if not already in array
                if (!state.loketSelectedRows[loketId].includes(voteId)) {
                    state.loketSelectedRows[loketId].push(voteId);
                }
            } else {
                // Remove vote ID from array
                state.loketSelectedRows[loketId] = state.loketSelectedRows[loketId].filter(id => id !== voteId);
            }
            
            render();
        });
    });

    // Event listeners untuk delete button
    const deleteButtons = document.querySelectorAll('.loket-delete-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const loketId = parseInt(btn.getAttribute('data-loket'));
            if (state.loketSelectedRows[loketId] && state.loketSelectedRows[loketId].length > 0) {
                if (confirm(`Yakin ingin menghapus ${state.loketSelectedRows[loketId].length} data responden?`)) {
                    await deleteSelectedLoketData(loketId);
                }
            } else {
                alert('Tidak ada data yang dipilih untuk dihapus');
            }
        });
    });

    // Reset inactivity timer on user interactions
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    document.addEventListener('mousemove', resetInactivityTimer);
}

// ============================================
// INITIALIZE APP
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is still logged in from previous session
    if (loadAdminSession()) {
        state.view = 'admin_dashboard';
        state.isLoggedIn = true;
        startInactivityTimer();
        loadVotes();
    } else {
        state.view = 'admin_login';
        state.isLoggedIn = false;
    }
    
    render();
});

// ============================================
// INITIALIZE APP
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadVotes();
    render();
});
