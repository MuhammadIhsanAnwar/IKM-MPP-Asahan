const statsState = {
    allVotes: [],
    currentPeriod: 'all'
};

function toPercent(value, total) {
    if (!total) return 0;
    return (value / total) * 100;
}

function formatPercent(value) {
    return `${value.toFixed(1)}%`;
}

function createBarRows(containerId, items, classResolver) {
    const container = document.getElementById(containerId);
    container.innerHTML = items.map(item => {
        const barClass = classResolver(item);
        const safePercent = Math.max(0, Math.min(100, item.percent || 0));

        return `
            <div class="chart-row">
                <div class="chart-label">${item.label}</div>
                <div class="bar-track">
                    <div class="bar-fill ${barClass}" style="width: ${safePercent}%;"></div>
                </div>
                <div class="chart-value">${formatPercent(safePercent)}</div>
            </div>
        `;
    }).join('');
}

function renderSummary(totalVotes, totalAnswers, avgScorePercent) {
    const summaryCards = document.getElementById('summaryCards');
    summaryCards.innerHTML = `
        <article class="summary-card">
            <h3>Total Responden</h3>
            <p>${totalVotes}</p>
        </article>
        <article class="summary-card">
            <h3>Total Jawaban Terkumpul</h3>
            <p>${totalAnswers}</p>
        </article>
        <article class="summary-card">
            <h3>Rata-rata Persentase Skor</h3>
            <p>${formatPercent(avgScorePercent)}</p>
        </article>
    `;
}

async function loadVotes() {
    try {
        const response = await fetch('../admin/api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'getVotes' })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const responseText = await response.text();
        console.log('Raw response:', responseText);

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Response text:', responseText.substring(0, 500));
            
            // Check if response looks like an error page
            if (responseText.includes('<html') || responseText.includes('<body') || responseText.includes('<br')) {
                throw new Error('Server mengembalikan error page. Periksa koneksi database atau konfigurasi server.');
            }
            
            throw new Error('Respons dari server tidak valid (bukan JSON)');
        }

        if (!result.success) {
            throw new Error(result.message || 'Gagal mengambil data survei');
        }

        return Array.isArray(result.data) ? result.data : [];
    } catch (error) {
        console.error('loadVotes error:', error);
        throw error;
    }
}

function calculateStatistics(votes) {
    const totalVotes = votes.length;

    const unsurStats = SURVEY_QUESTIONS.map(question => {
        let totalScore = 0;
        let totalAnswered = 0;

        votes.forEach(vote => {
            const score = Number(vote?.answers?.[question.id]);
            if (score >= 1 && score <= 4) {
                totalScore += score;
                totalAnswered += 1;
            }
        });

        const percent = totalAnswered ? (totalScore / (totalAnswered * 4)) * 100 : 0;

        return {
            label: question.text,
            percent,
            answered: totalAnswered
        };
    });

    const educationMap = new Map();
    EDUCATION_OPTIONS.forEach(option => educationMap.set(option, 0));
    educationMap.set('Lainnya/Tidak Diisi', 0);

    votes.forEach(vote => {
        const education = (vote?.respondent?.education || '').trim();
        if (educationMap.has(education)) {
            educationMap.set(education, educationMap.get(education) + 1);
        } else {
            educationMap.set('Lainnya/Tidak Diisi', educationMap.get('Lainnya/Tidak Diisi') + 1);
        }
    });

    const educationStats = Array.from(educationMap.entries()).map(([label, count]) => ({
        label,
        percent: toPercent(count, totalVotes),
        count
    })).filter(item => item.count > 0 || totalVotes === 0);

    const qualityLabels = {
        1: 'Tidak Baik',
        2: 'Kurang Baik',
        3: 'Baik',
        4: 'Sangat Baik'
    };

    const qualityCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

    votes.forEach(vote => {
        SURVEY_QUESTIONS.forEach(question => {
            const score = Number(vote?.answers?.[question.id]);
            if (score >= 1 && score <= 4) {
                qualityCounts[score] += 1;
            }
        });
    });

    const totalAnswers = Object.values(qualityCounts).reduce((sum, count) => sum + count, 0);

    const qualityStats = [1, 2, 3, 4].map(key => ({
        label: qualityLabels[key],
        key,
        percent: toPercent(qualityCounts[key], totalAnswers),
        count: qualityCounts[key]
    }));

    const avgScorePercent = totalAnswers
        ? ((qualityCounts[1] * 1 + qualityCounts[2] * 2 + qualityCounts[3] * 3 + qualityCounts[4] * 4) / (totalAnswers * 4)) * 100
        : 0;

    return {
        totalVotes,
        totalAnswers,
        avgScorePercent,
        unsurStats,
        educationStats,
        qualityStats
    };
}

function renderError(message) {
    const statsApp = document.getElementById('statsApp');
    statsApp.innerHTML = `<div class="error-state">${message}</div>`;
}

function renderEmpty() {
    const statsApp = document.getElementById('statsApp');
    statsApp.innerHTML = `<div class="empty-state">Belum ada data survei untuk ditampilkan.</div>`;
}

function toLocalDateParts(dateInput) {
    const dt = new Date(dateInput);
    return {
        year: dt.getFullYear(),
        month: dt.getMonth(),
        date: dt.getDate()
    };
}

function filterVotesByPeriod(votes, period) {
    if (period === 'all') return votes;

    const today = new Date();
    const todayParts = toLocalDateParts(today);

    return votes.filter(vote => {
        if (!vote?.created_at) return false;

        const voteParts = toLocalDateParts(vote.created_at);

        if (period === 'today') {
            return voteParts.year === todayParts.year && voteParts.month === todayParts.month && voteParts.date === todayParts.date;
        }

        if (period === 'month') {
            return voteParts.year === todayParts.year && voteParts.month === todayParts.month;
        }

        return true;
    });
}

function renderNoDataForFilter() {
    renderSummary(0, 0, 0);

    const emptyRows = [{ label: 'Belum ada data pada periode ini', percent: 0, key: 1 }];
    createBarRows('unsurChart', emptyRows, () => 'unsur');
    createBarRows('educationChart', emptyRows, () => 'education');
    createBarRows('answerQualityChart', emptyRows, () => 'quality-1');
}

function renderFilteredStatistics() {
    const filteredVotes = filterVotesByPeriod(statsState.allVotes, statsState.currentPeriod);

    if (!filteredVotes.length) {
        renderNoDataForFilter();
        return;
    }

    const stats = calculateStatistics(filteredVotes);
    renderSummary(stats.totalVotes, stats.totalAnswers, stats.avgScorePercent);
    createBarRows('unsurChart', stats.unsurStats, () => 'unsur');
    createBarRows('educationChart', stats.educationStats, () => 'education');
    createBarRows('answerQualityChart', stats.qualityStats, (item) => `quality-${item.key}`);
}

function attachFilterListeners() {
    const periodFilter = document.getElementById('periodFilter');
    if (!periodFilter) return;

    periodFilter.addEventListener('change', (event) => {
        statsState.currentPeriod = event.target.value;
        renderFilteredStatistics();
    });
}

async function initializeStatisticsPage() {
    try {
        const votes = await loadVotes();

        if (!votes.length) {
            renderEmpty();
            return;
        }

        statsState.allVotes = votes;
        attachFilterListeners();
        renderFilteredStatistics();
    } catch (error) {
        console.error(error);
        renderError('Gagal memuat statistik. Silakan coba lagi.');
    }
}

document.addEventListener('DOMContentLoaded', initializeStatisticsPage);
