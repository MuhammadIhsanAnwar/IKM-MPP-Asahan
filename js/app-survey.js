// ============================================
// SURVEY APPLICATION STATE
// ============================================
const state = {
    view: 'kiosk_select',
    selectedLoket: null,
    votes: [],
    loading: false,
    showThankYou: false,
    showReviewModal: false,
    demographics: {
        gender: '',
        education: '',
        occupation: '',
        age: ''
    },
    currentQuestionIdx: 0,
    answers: {},
    alert: null,
    isSubmitting: false
};

// ============================================
// URL HASH MANAGEMENT
// ============================================

function updateURLHash() {
    if (state.selectedLoket) {
        if (state.showThankYou) {
            window.location.hash = `#loket/${state.selectedLoket}/thankyou`;
        } else if (state.view === 'kiosk_vote') {
            window.location.hash = `#loket/${state.selectedLoket}/vote`;
        } else if (state.view === 'kiosk_demographics') {
            window.location.hash = `#loket/${state.selectedLoket}/demographics`;
        }
    } else {
        window.location.hash = '';
    }
}

function parseURLHash() {
    const hash = window.location.hash.slice(1); // Remove '#'
    const parts = hash.split('/');
    
    if (parts[0] === 'loket' && parts[1]) {
        const loketId = parseInt(parts[1]);
        const page = parts[2] || 'demographics';
        
        state.selectedLoket = loketId;
        
        // Only reset demographics if we're starting a new survey (going to demographics page)
        // Don't reset if we're already in the middle of a survey (vote page)
        if (page === 'demographics') {
            state.demographics = { gender: '', education: '', occupation: '', age: '' };
        }
        // If page is 'vote' or 'thankyou', preserve existing demographics!
        
        state.answers = {};
        state.currentQuestionIdx = 0;
        state.showThankYou = false;
        state.showReviewModal = false;
        
        if (page === 'thankyou') {
            state.showThankYou = true;
            state.view = 'kiosk_demographics'; // Store previous view
        } else if (page === 'vote') {
            state.view = 'kiosk_vote';
        } else {
            state.view = 'kiosk_demographics';
        }
        
        return true;
    }
    return false;
}

// ============================================
// LOCALSTORAGE FUNCTIONS
// ============================================

function saveState() {
    try {
        localStorage.setItem('ikmSurveyState', JSON.stringify({
            view: state.view,
            selectedLoket: state.selectedLoket,
            demographics: state.demographics,
            currentQuestionIdx: state.currentQuestionIdx,
            answers: state.answers,
            showReviewModal: state.showReviewModal
        }));
    } catch (e) {
        console.warn('LocalStorage save failed:', e);
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('ikmSurveyState');
        if (saved) {
            const data = JSON.parse(saved);
            // Only restore if user was in the middle of survey (demographics or vote)
            // Don't restore if they were just at loket selection
            if (data.view === 'kiosk_demographics' || data.view === 'kiosk_vote') {
                state.view = data.view;
                state.selectedLoket = data.selectedLoket || state.selectedLoket;
                state.demographics = data.demographics || state.demographics;
                state.currentQuestionIdx = data.currentQuestionIdx !== undefined ? data.currentQuestionIdx : state.currentQuestionIdx;
                state.answers = data.answers || state.answers;
                state.showReviewModal = data.showReviewModal || false;
                state.loading = false;
                return true;
            } else if (data.showThankYou) {
                // If thank you screen was shown, restore that
                state.view = data.view;
                state.selectedLoket = data.selectedLoket;
                state.demographics = data.demographics;
                state.currentQuestionIdx = data.currentQuestionIdx;
                state.answers = data.answers;
                state.showThankYou = true;
                return true;
            }
        }
    } catch (e) {
        console.warn('LocalStorage load failed:', e);
    }
    return false;
}

function clearState() {
    try {
        localStorage.removeItem('ikmSurveyState');
    } catch (e) {
        console.warn('LocalStorage clear failed:', e);
    }
}

// ============================================
// API FUNCTIONS
// ============================================

async function apiCall(action, data = {}) {
    try {
        const payload = { action, ...data };
        console.log('API Call:', action, payload);
        
        const response = await fetch('admin/api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            timeout: 10000 // 10 second timeout
        });

        console.log('API Response Status:', response.status, response.statusText);

        if (!response.ok) {
            console.error('API HTTP Error:', response.status, response.statusText);
            showAlert(`Error: ${response.status} ${response.statusText}`, 'error');
            return null;
        }

        const responseText = await response.text();
        console.log('API Response Text:', responseText);

        // Try to parse as JSON
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Response was:', responseText);
            showAlert('Server response tidak valid. Silakan periksa koneksi server.', 'error');
            return null;
        }

        console.log('API Response:', result);
        
        if (!result.success) {
            console.warn('API Error Response:', result.message);
            showAlert(result.message || 'Terjadi kesalahan', 'error');
            return null;
        }

        console.log('API Success:', result.data);
        return result.data;
    } catch (error) {
        console.error('API Error:', error.message, error);
        showAlert('Gagal terhubung ke server: ' + error.message, 'error');
        return null;
    }
}

async function saveVote(answers) {
    // Prevent multiple submissions
    if (state.isSubmitting) {
        console.log('Already submitting, ignoring click');
        return;
    }

    state.isSubmitting = true;
    render(); // Re-render to show loading state

    const values = Object.values(answers);
    const rating = values.reduce((a, b) => a + b, 0) / values.length;

    state.loading = true;

    console.log('saveVote called with demographics:', state.demographics);
    console.log('Full state:', JSON.stringify(state));

    const result = await apiCall('saveVote', {
        loketId: state.selectedLoket,
        answers: answers,
        rating: rating,
        respondent: state.demographics
    });

    if (result) {
        console.log('Vote saved successfully!');
        state.showThankYou = true;
        state.showReviewModal = false;
        state.isSubmitting = false;
        // Don't clear state here - keep it for page refresh
        updateURLHash();
        render();

        setTimeout(() => {
            state.showThankYou = false;
            state.view = 'kiosk_select';
            state.selectedLoket = null;
            state.demographics = { gender: '', education: '', occupation: '', age: '' };
            state.currentQuestionIdx = 0;
            state.answers = {};
            state.isSubmitting = false;
            window.location.hash = '';
            clearState();  // Clear after reset
            loadVotes();
        }, 3000);
    } else {
        console.error('Vote save failed!');
        state.loading = false;
        state.isSubmitting = false;
        state.showReviewModal = true;
        render(); // Re-render to reset button state
    }
}

async function loadVotes() {
    state.loading = true;
    render();

    const result = await apiCall('getVotes');
    
    if (result) {
        state.votes = result;
        state.loading = false;
        render();
    }
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

function handleLoketSelect(num) {
    state.selectedLoket = num;
    state.demographics = { gender: '', education: '', occupation: '', age: '' };
    state.answers = {};
    state.currentQuestionIdx = 0;
    state.view = 'kiosk_demographics';
    updateURLHash();
    render();
}

function handleDemographicsSubmit(e) {
    e.preventDefault();
    
    console.log('Form submit - Current demographics:', state.demographics);
    
    // Validasi setiap field
    let emptyFields = [];
    if (!state.demographics.gender) emptyFields.push('Jenis Kelamin');
    if (!state.demographics.education) emptyFields.push('Pendidikan Terakhir');
    if (!state.demographics.occupation) emptyFields.push('Pekerjaan');
    if (!state.demographics.age) emptyFields.push('Kelompok Usia');
    
    if (emptyFields.length > 0) {
        console.warn('Missing fields:', emptyFields);
        showAlert(`Mohon lengkapi: ${emptyFields.join(', ')}`, 'warning');
        return;
    }
    
    state.view = 'kiosk_vote';
    updateURLHash();
    render();
}

function handleAnswer(value) {
    const currentQ = SURVEY_QUESTIONS[state.currentQuestionIdx];
    state.answers[currentQ.id] = value;

    if (state.currentQuestionIdx < SURVEY_QUESTIONS.length - 1) {
        state.currentQuestionIdx++;
        render();
    } else {
        state.showReviewModal = true;
        render();
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderAlert() {
    if (!state.alert) return '';
    
    let icon = '';
    switch(state.alert.type) {
        case 'success':
            icon = '✓';
            break;
        case 'warning':
            icon = '⚠';
            break;
        case 'error':
            icon = '✕';
            break;
        default:
            icon = 'ℹ';
    }
    
    return `
        <div style="grid-column: 1 / -1; width: 100%; box-sizing: border-box;">
            <div class="alert ${state.alert.type}" style="width: 100%; box-sizing: border-box; margin: 0 0 1rem 0;">
                <span style="font-size: 1.3rem; flex-shrink: 0;">${icon}</span>
                <span>${state.alert.message}</span>
            </div>
        </div>
    `;
}

function renderThankYouScreen() {
    const config = getResponsiveConfig();
    return `
        <div class="thank-you-overlay animate-fade-in" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #10b981 0%, #059669 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2000; padding: ${config.cardPadding};">
            <div style="text-align: center; color: white;">
                ${SVGIcon('heart', 120)}
                <h1 style="margin: ${config.cardPadding} 0; font-size: ${config.headerFontSize}; line-height: 1.3; font-family: 'Segoe UI', 'Poppins', sans-serif; font-weight: 700; letter-spacing: 0.5px;">Terima Kasih!</h1>
                <p style="margin: ${config.cardPadding} 0 0 0; font-size: ${config.subheaderFontSize}; opacity: 0.95; max-width: 400px; font-family: 'Segoe UI', 'Poppins', sans-serif; line-height: 1.6;">Masukan Anda sangat berharga bagi kemajuan kami.</p>
            </div>
        </div>
    `;
}

function renderLoketSelection() {
    const config = getResponsiveConfig();
    
    return `
        <div class="min-h-screen flex-col" style="width: 100%; margin: 0; padding: 0; display: flex; flex-direction: column;">
            <header style="width: 100%; box-sizing: border-box; padding: ${config.headerPadding};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; gap: 1rem; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 200px;">
                        <h1 style="margin: 0; font-size: ${config.headerFontSize}; line-height: 1.3;">Survei Kepuasan Masyarakat - Mal Pelayanan Publik Kabupaten Asahan</h1>
                        <p style="margin: 0.5rem 0 0 0; font-size: ${config.subheaderFontSize}; opacity: 0.9;">Pilih nomor loket layanan Anda</p>
                    </div>
                    <button id="adminLoginBtn" style="background: rgba(255,255,255, 0.2); border: none; color: white; padding: 0.5rem; border-radius: 9999px; cursor: pointer; transition: all 0.3s; flex-shrink: 0; min-height: ${config.minTouchTarget}; min-width: ${config.minTouchTarget}; display: flex; align-items: center; justify-content: center;">
                        ${SVGIcon('logIn', 22)}
                    </button>
                </div>
            </header>

            <main class="main-content" style="width: 100%; box-sizing: border-box; flex: 1; padding: ${config.cardPadding};">
                <div class="container" style="width: 100%; max-width: 1400px; margin: 0 auto;">
                    ${renderAlert()}
                    <div class="grid-loket" style="display: grid; grid-template-columns: ${getLoketGridColumns()}; gap: ${config.gridGap}; width: 100%; box-sizing: border-box;">
                        ${LOKET_DATA.map(loket => `
                            <button 
                                class="loket-btn"
                                data-loket="${loket.id}"
                                style="padding: ${config.buttonPadding}; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 0.75rem; border: 2px solid var(--gray-200); background: white; cursor: pointer; transition: all 0.3s; gap: 0.75rem; min-height: 110px;"
                            >
                                <span class="loket-number" style="font-size: ${config.subheaderFontSize}; font-weight: 600;">Loket ${loket.id}</span>
                                <img src="${loket.logo}" alt="Loket ${loket.id}" class="loket-logo" style="max-width: 70%; height: auto; object-fit: contain;">
                            </button>
                        `).join('')}
                    </div>
                </div>
            </main>

            <footer style="background: white; border-top: 1px solid var(--gray-200); padding: ${config.headerPadding}; text-align: center; color: var(--gray-400); font-size: ${config.subheaderFontSize}; width: 100%; box-sizing: border-box;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
                    📄 <span>Sesuai Permenpan RB No. 14 Tahun 2017</span>
                </div>
                © ${new Date().getFullYear()} Jan@ASR_Mal Pelayanan Publik Kabupaten Asahan
            </footer>
        </div>
    `;
}

function renderDemographicsForm() {
    const config = getResponsiveConfig();
    
    return `
        <div style="width: 100vw; height: 100vh; margin: 0; padding: 0; display: flex; flex-direction: column; overflow: hidden; background: white;">
            <header style="width: 100%; box-sizing: border-box; padding: 0.7rem 1rem; flex-shrink: 0; border-bottom: 2px solid var(--primary); background: linear-gradient(135deg, var(--primary), var(--primary-dark));">
                <button id="backDemographicsBtn" style="color: white; background: none; border: none; cursor: pointer; margin: 0; font-size: 0.95rem; display: flex; align-items: center; gap: 0.4rem; min-height: 32px; font-weight: 500;">
                    ${SVGIcon('chevronLeft', 20)} Kembali
                </button>
                <div style="text-align: right; margin-top: 0.3rem;">
                    <h1 style="margin: 0; font-size: 1.3rem; font-weight: bold;">LOKET ${state.selectedLoket}</h1>
                    <p style="font-size: 0.85rem; opacity: 0.9; margin: 0;">Data Diri</p>
                </div>
            </header>

            <main style="width: 100%; flex: 1; padding: 1.2rem; box-sizing: border-box; overflow-y: auto; display: flex; justify-content: center; align-items: flex-start;">
                <form id="demographicsForm" style="width: 100%; max-width: 1000px; display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem;">
                    ${renderAlert()}
                    
                    <!-- Jenis Kelamin - Full Width -->
                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--gray-800);">👤 Jenis Kelamin</label>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                            ${['L', 'P'].map(g => `
                                <button type="button" class="form-option ${state.demographics.gender === g ? 'active' : ''}" data-gender="${g}" style="min-height: 48px; padding: 0.5rem; border: 2px solid ${state.demographics.gender === g ? 'var(--primary)' : 'var(--gray-300)'}; background: ${state.demographics.gender === g ? 'var(--primary)' : 'white'}; color: ${state.demographics.gender === g ? 'white' : 'var(--gray-800)'}; border-radius: 0.5rem; cursor: pointer; font-size: 0.95rem; font-weight: 600; transition: all 0.2s;">
                                    ${g === 'L' ? 'Laki-laki' : 'Perempuan'}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Pendidikan -->
                    <div>
                        <label style="display: block; font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--gray-800);">🎓 Pendidikan</label>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 0.35rem;">
                            ${EDUCATION_OPTIONS.map(edu => `
                                <button type="button" class="form-option ${state.demographics.education === edu ? 'active' : ''}" data-education="${edu}" style="min-height: 38px; padding: 0.4rem 0.6rem; border: 1.5px solid ${state.demographics.education === edu ? 'var(--primary)' : 'var(--gray-300)'}; background: ${state.demographics.education === edu ? 'var(--primary)' : 'white'}; color: ${state.demographics.education === edu ? 'white' : 'var(--gray-800)'}; border-radius: 0.4rem; cursor: pointer; font-size: 0.85rem; font-weight: 500; text-align: center; transition: all 0.2s;">
                                    ${edu}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Pekerjaan -->
                    <div>
                        <label style="display: block; font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--gray-800);">💼 Pekerjaan</label>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 0.35rem;">
                            ${OCCUPATION_OPTIONS.map(occ => `
                                <button type="button" class="form-option ${state.demographics.occupation === occ ? 'active' : ''}" data-occupation="${occ}" style="min-height: 38px; padding: 0.4rem 0.6rem; border: 1.5px solid ${state.demographics.occupation === occ ? 'var(--primary)' : 'var(--gray-300)'}; background: ${state.demographics.occupation === occ ? 'var(--primary)' : 'white'}; color: ${state.demographics.occupation === occ ? 'white' : 'var(--gray-800)'}; border-radius: 0.4rem; cursor: pointer; font-size: 0.85rem; font-weight: 500; text-align: center; transition: all 0.2s;">
                                    ${occ}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Kelompok Usia -->
                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--gray-800);">📅 Kelompok Usia</label>
                        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.4rem;">
                            ${AGE_RANGES.map(range => `
                                <button type="button" class="form-option ${state.demographics.age === range.label ? 'active' : ''}" data-age="${range.label}" style="min-height: 42px; padding: 0.4rem 0.3rem; border: 1.5px solid ${state.demographics.age === range.label ? 'var(--primary)' : 'var(--gray-300)'}; background: ${state.demographics.age === range.label ? 'var(--primary)' : 'white'}; color: ${state.demographics.age === range.label ? 'white' : 'var(--gray-800)'}; border-radius: 0.4rem; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; justify-content: center;">
                                    ${range.label}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <button type="submit" style="grid-column: 1 / -1; min-height: 50px; padding: 0.7rem; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; font-weight: 700; transition: all 0.3s; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3); margin-top: 0.6rem;">
                        Lanjutkan ke Survei →
                    </button>
                </form>
            </main>
        </div>
    `;
}

function renderVoteScreen() {
    const config = getResponsiveConfig();
    const currentQ = SURVEY_QUESTIONS[state.currentQuestionIdx];
    const progress = ((state.currentQuestionIdx) / SURVEY_QUESTIONS.length) * 100;
    
    if (state.showReviewModal) {
        console.log('Rendering review modal with buttons');
        return `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; pointer-events: all; padding: ${config.cardPadding};">
                <div style="background: white; border-radius: 0.75rem; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; box-sizing: border-box; pointer-events: all; padding: ${config.modalPadding}; display: flex; flex-direction: column; gap: 1rem;">
                    <h2 style="font-size: ${config.headerFontSize}; font-weight: bold; margin: 0; line-height: 1.3;">Konfirmasi Jawaban</h2>
                    <p style="line-height: 1.6; color: var(--gray-600); margin: 0; font-size: ${config.subheaderFontSize};">
                        Apakah Anda yakin dengan jawaban yang sudah diberikan? Setelah ini, data tidak dapat diubah lagi.
                    </p>
                    <div style="display: flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap; width: 100%; pointer-events: all; margin-top: 1rem;">
                        <button id="confirmCancelBtn" type="button" style="background-color: var(--danger); color: white; padding: ${config.buttonPadding} 1.25rem; min-height: ${config.minTouchTarget}; border-radius: 0.5rem; border: none; cursor: pointer; font-weight: 600; flex: 1; min-width: 100px; font-size: ${config.subheaderFontSize}; pointer-events: all; opacity: ${state.isSubmitting ? '0.6' : '1'}; cursor: ${state.isSubmitting ? 'not-allowed' : 'pointer'}; display: flex; align-items: center; justify-content: center;" ${state.isSubmitting ? 'disabled' : ''}>Kembali Ubah</button>
                        <button id="confirmSubmitBtn" type="button" style="background-color: var(--primary); color: white; padding: ${config.buttonPadding} 1.25rem; min-height: ${config.minTouchTarget}; border-radius: 0.5rem; border: none; cursor: pointer; font-weight: 600; flex: 1; min-width: 100px; font-size: ${config.subheaderFontSize}; pointer-events: all; opacity: ${state.isSubmitting ? '0.6' : '1'}; cursor: ${state.isSubmitting ? 'not-allowed' : 'pointer'}; display: flex; align-items: center; justify-content: center;" ${state.isSubmitting ? 'disabled' : ''}>
                            ${state.isSubmitting ? '⏳ Mengirim...' : 'Ya, Kirimkan'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="min-h-screen flex-col" style="width: 100%; margin: 0; padding: 0; display: flex; flex-direction: column;">
            <header style="width: 100%; box-sizing: border-box; padding: ${config.headerPadding};">
                <button id="backVoteBtn" style="color: white; background: none; border: none; cursor: pointer; margin-bottom: 1rem; font-size: ${config.subheaderFontSize}; display: flex; align-items: center; gap: 0.5rem; min-height: ${config.minTouchTarget};">
                    ${SVGIcon('chevronLeft', 24)} ${state.currentQuestionIdx === 0 ? 'Kembali' : 'Sebelumnya'}
                </button>
                <div style="text-align: right;">
                    <h1 style="margin: 0; font-size: ${config.headerFontSize}; line-height: 1.2;">LOKET ${state.selectedLoket} - ${getLoketName(state.selectedLoket)}</h1>
                    <p style="font-size: ${config.subheaderFontSize}; opacity: 0.9; margin: 0.5rem 0 0 0;">Unsur ${state.currentQuestionIdx + 1} dari 9</p>
                </div>
            </header>

            <div style="width: 100%; height: 4px; background: var(--gray-200); box-sizing: border-box;">
                <div style="height: 100%; background: var(--primary); width: ${progress}%; transition: width 0.3s;"></div>
            </div>

            <main class="main-content flex-center" style="width: 100%; box-sizing: border-box; flex: 1; padding: ${config.cardPadding}; display: flex; justify-content: center; align-items: center; overflow-y: auto;">
                <div style="width: 100%; max-width: 900px; box-sizing: border-box;">
                    <div style="background: white; border-radius: 0.75rem; padding: ${config.cardPadding}; text-align: center; box-sizing: border-box;">
                        <h3 style="color: var(--primary); font-weight: 700; text-transform: uppercase; font-size: ${config.subheaderFontSize}; letter-spacing: 2px; margin-bottom: 1rem; font-family: 'Segoe UI', 'Poppins', sans-serif; font-style: normal; tracking: wider;">
                            Sangat Penting Bagi Kami
                        </h3>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                            <div style="display: inline-flex; align-items: center; justify-content: center; background: var(--primary); color: white; width: 50px; height: 50px; border-radius: 6px; font-size: 1.4rem; font-weight: bold; flex-shrink: 0; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.2);">
                                ${state.currentQuestionIdx + 1}
                            </div>
                            <h1 style="margin: 0; text-align: center; font-size: ${config.headerFontSize}; line-height: 1.3; font-family: 'Segoe UI', 'Poppins', sans-serif; font-weight: 600; letter-spacing: 0.3px;">
                                ${currentQ.text}
                            </h1>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(${config.ratingGridColumns}, 1fr); gap: ${config.gridGap}; width: 100%; box-sizing: border-box;">
                            ${[4, 3, 2, 1].map(val => {
                                const emojiMap = { 4: '😍', 3: '😊', 2: '😕', 1: '😠' };
                                const labelMap = { 4: 'Sangat Puas', 3: 'Puas', 2: 'Kurang Puas', 1: 'Sangat Tidak Puas' };
                                return `
                                    <button 
                                        type="button"
                                        class="rating-btn"
                                        data-answer="${val}"
                                        style="min-height: ${config.ratingButtonHeight}; padding: 0.5rem; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid var(--gray-300); background: white; border-radius: 0.5rem; cursor: pointer; transition: all 0.3s; gap: 0.5rem; min-width: 100%; box-sizing: border-box;"
                                    >
                                        <div style="font-size: ${config.ratingEmojiFontSize}; line-height: 1; text-align: center;">${emojiMap[val]}</div>
                                        <span style="font-size: ${config.ratingLabelFontSize}; text-align: center; line-height: 1.2; overflow: visible; word-wrap: break-word; white-space: normal; flex-wrap: wrap; min-height: auto; color: var(--gray-800); font-weight: 600; font-family: 'Segoe UI', 'Poppins', sans-serif; letter-spacing: 0.2px;">${labelMap[val]}</span>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    `;
}

function render() {
    const app = document.getElementById('app');

    if (state.showThankYou) {
        app.innerHTML = renderThankYouScreen();
        saveState();  // Save state when showing thank you
        // Add animation to thank you screen
        setTimeout(() => {
            const thankYouOverlay = document.querySelector('.thank-you-overlay');
            if (thankYouOverlay) {
                addPageTransitionAnimation(thankYouOverlay, 'scale');
            }
        }, 10);
        return;
    }

    switch (state.view) {
        case 'kiosk_demographics':
            app.innerHTML = renderDemographicsForm();
            attachDemographicsListeners();
            updateURLHash();
            saveState();
            // Add animation
            setTimeout(() => {
                const form = document.getElementById('demographicsForm');
                if (form && form.parentElement) {
                    addPageTransitionAnimation(form.parentElement, 'slideUp');
                }
            }, 10);
            break;
        case 'kiosk_vote':
            app.innerHTML = renderVoteScreen();
            attachVoteListeners();
            updateURLHash();
            saveState();
            // Add animation
            setTimeout(() => {
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    addPageTransitionAnimation(mainContent, 'fadeIn');
                }
            }, 10);
            break;
        case 'kiosk_select':
        default:
            app.innerHTML = renderLoketSelection();
            attachLoketListeners();
            // Add animation to grid
            setTimeout(() => {
                const gridLoket = document.querySelector('.grid-loket');
                if (gridLoket) {
                    addPageTransitionAnimation(gridLoket, 'fadeIn');
                }
            }, 10);
            break;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function attachLoketListeners() {
    document.querySelectorAll('.loket-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Add click animation
            btn.style.animation = 'scaleIn 0.3s ease-out, translateY 0.3s ease-out';
            const num = parseInt(btn.dataset.loket);
            handleLoketSelect(num);
        });
    });

    document.getElementById('adminLoginBtn').addEventListener('click', () => {
        window.location.href = 'admin/admin.php';
    });
}

function attachDemographicsListeners() {
    const form = document.getElementById('demographicsForm');

    document.querySelectorAll('[data-gender]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btn.style.animation = 'scaleIn 0.2s ease-out';
            state.demographics.gender = btn.dataset.gender;
            console.log('Selected gender:', state.demographics.gender);
            render();
        });
    });

    document.querySelectorAll('[data-education]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btn.style.animation = 'scaleIn 0.2s ease-out';
            state.demographics.education = btn.dataset.education;
            console.log('Selected education:', state.demographics.education);
            render();
        });
    });

    document.querySelectorAll('[data-occupation]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btn.style.animation = 'scaleIn 0.2s ease-out';
            state.demographics.occupation = btn.dataset.occupation;
            console.log('Selected occupation:', state.demographics.occupation);
            render();
        });
    });

    document.querySelectorAll('[data-age]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            btn.style.animation = 'scaleIn 0.2s ease-out';
            state.demographics.age = btn.dataset.age;
            console.log('Selected age:', state.demographics.age);
            render();
        });
    });

    form.addEventListener('submit', handleDemographicsSubmit);

    document.getElementById('backDemographicsBtn').addEventListener('click', () => {
        state.selectedLoket = null;
        state.demographics = { gender: '', education: '', occupation: '', age: '' };
        state.view = 'kiosk_select';
        window.location.hash = '';
        render();
    });
}

function attachVoteListeners() {
    // Attach listeners untuk rating buttons
    document.querySelectorAll('[data-answer]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Add click animation
            btn.style.animation = 'scaleIn 0.3s ease-out';
            const value = parseInt(btn.dataset.answer);
            handleAnswer(value);
        });
    });

    // Attach listener untuk back button
    const backBtn = document.getElementById('backVoteBtn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (state.currentQuestionIdx > 0) {
                state.currentQuestionIdx--;
            } else {
                state.view = 'kiosk_demographics';
            }
            render();
        });
    }

    // Direct event listeners untuk modal buttons - dengan proper timing
    setTimeout(() => {
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const submitBtn = document.getElementById('confirmSubmitBtn');

        if (cancelBtn) {
            cancelBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Cancel button clicked');
                state.showReviewModal = false;
                render();
                return false;
            };
        }

        if (submitBtn) {
            submitBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Submit button clicked, isSubmitting:', state.isSubmitting);
                if (!state.isSubmitting) {
                    saveVote(state.answers);
                }
                return false;
            };
        }
    }, 0);
}

// Global event delegation untuk modal buttons - fallback
document.addEventListener('click', (e) => {
    if (e.target.id === 'confirmCancelBtn') {
        e.preventDefault();
        e.stopPropagation();
        console.log('Global: Cancel button clicked');
        state.showReviewModal = false;
        render();
        return false;
    }
    
    if (e.target.id === 'confirmSubmitBtn') {
        e.preventDefault();
        e.stopPropagation();
        console.log('Global: Submit button clicked');
        if (!state.isSubmitting) {
            saveVote(state.answers);
        }
        return false;
    }
}, false); // Use bubbling phase

// ============================================
// INITIALIZE APP
// ============================================

// ============================================
// LOADING SCREEN FUNCTIONS
// ============================================

function showLoadingScreen() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="loading-screen">
            <div class="loading-spinner"></div>
            <div class="loading-text">Memuat...</div>
        </div>
    `;
}

function hideLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        loadingScreen.style.animation = 'fadeOut 0.5s ease-out forwards';
        setTimeout(() => {
            if (loadingScreen.parentNode) {
                loadingScreen.parentNode.removeChild(loadingScreen);
            }
        }, 500);
    }
}

// ============================================
// ANIMATION UTILITIES
// ============================================

function addPageTransitionAnimation(element, animationType = 'fadeIn') {
    if (!element) return;
    
    // Remove old animation classes
    element.classList.remove('animate-fade-in', 'animate-slide-up', 'animate-slide-down', 'animate-scale-in');
    
    // Add new animation
    if (animationType === 'slideUp') {
        element.classList.add('animate-slide-up');
    } else if (animationType === 'slideDown') {
        element.classList.add('animate-slide-down');
    } else if (animationType === 'scale') {
        element.classList.add('animate-scale-in');
    } else {
        element.classList.add('animate-fade-in');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Show loading screen
    showLoadingScreen();
    
    // Simulate minimal loading time for smooth transition
    setTimeout(() => {
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', function(event) {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);

        // First, try to restore from URL hash
        const urlRestored = parseURLHash();
        
        if (!urlRestored) {
            state.view = 'kiosk_select';
        }
        
        render();
        hideLoadingScreen();
    }, 500); // 500ms loading animation time
});

// Listen for URL hash changes
window.addEventListener('hashchange', () => {
    if (parseURLHash()) {
        render();
    }
});

// ============================================
// RESPONSIVE DESIGN HELPER
// ============================================

function getLoketGridColumns() {
    const config = getResponsiveConfig();
    return `repeat(${config.loketGridColumns}, 1fr)`;
}

function getResponsiveConfig() {
    const width = window.innerWidth;
    
    if (width < 360) {
        // Mobile sangat kecil (< 360px)
        return {
            loketGridColumns: 2,
            headerPadding: '0.5rem',
            headerFontSize: '0.9rem',
            subheaderFontSize: '0.65rem',
            cardPadding: '0.75rem',
            buttonPadding: '0.4rem',
            gridGap: '0.4rem',
            ratingGridColumns: 2,
            ratingButtonHeight: '80px',
            ratingEmojiFontSize: '2.2rem',
            ratingLabelFontSize: '0.8rem',
            modalPadding: '1rem',
            minTouchTarget: '44px',
            labelMarginBottom: '0.5rem'
        };
    } else if (width < 480) {
        // Mobile kecil (360px - 480px)
        return {
            loketGridColumns: 2,
            headerPadding: '0.75rem',
            headerFontSize: '1rem',
            subheaderFontSize: '0.7rem',
            cardPadding: '1rem',
            buttonPadding: '0.5rem',
            gridGap: '0.5rem',
            ratingGridColumns: 2,
            ratingButtonHeight: '90px',
            ratingEmojiFontSize: '2.5rem',
            ratingLabelFontSize: '0.85rem',
            modalPadding: '1rem',
            minTouchTarget: '44px',
            labelMarginBottom: '0.75rem'
        };
    } else if (width < 768) {
        // Mobile/Tablet kecil (480px - 768px)
        return {
            loketGridColumns: 3,
            headerPadding: '1rem',
            headerFontSize: '1.25rem',
            subheaderFontSize: '0.8rem',
            cardPadding: '1.25rem',
            buttonPadding: '0.6rem',
            gridGap: '0.75rem',
            ratingGridColumns: 2,
            ratingButtonHeight: '100px',
            ratingEmojiFontSize: '2.8rem',
            ratingLabelFontSize: '0.9rem',
            modalPadding: '1.25rem',
            minTouchTarget: '48px',
            labelMarginBottom: '0.75rem'
        };
    } else if (width < 1024) {
        // Tablet (768px - 1024px)
        return {
            loketGridColumns: 4,
            headerPadding: '1.25rem',
            headerFontSize: '1.5rem',
            subheaderFontSize: '0.85rem',
            cardPadding: '1.5rem',
            buttonPadding: '0.7rem',
            gridGap: '0.85rem',
            ratingGridColumns: 4,
            ratingButtonHeight: '110px',
            ratingEmojiFontSize: '3rem',
            ratingLabelFontSize: '0.95rem',
            modalPadding: '1.5rem',
            minTouchTarget: '48px',
            labelMarginBottom: '0.75rem'
        };
    } else if (width < 1440) {
        // Desktop standar (1024px - 1440px)
        return {
            loketGridColumns: 6,
            headerPadding: '1.5rem',
            headerFontSize: '1.75rem',
            subheaderFontSize: '0.9rem',
            cardPadding: '1.5rem',
            buttonPadding: '0.75rem',
            gridGap: '1rem',
            ratingGridColumns: 4,
            ratingButtonHeight: '110px',
            ratingEmojiFontSize: '3.5rem',
            ratingLabelFontSize: '1rem',
            modalPadding: '1.5rem',
            minTouchTarget: '44px',
            labelMarginBottom: '0.75rem'
        };
    } else {
        // Desktop besar (> 1440px)
        return {
            loketGridColumns: 6,
            headerPadding: '2rem',
            headerFontSize: '2rem',
            subheaderFontSize: '0.95rem',
            cardPadding: '2rem',
            buttonPadding: '0.85rem',
            gridGap: '1.25rem',
            ratingGridColumns: 4,
            ratingButtonHeight: '120px',
            ratingEmojiFontSize: '3.8rem',
            ratingLabelFontSize: '1.05rem',
            modalPadding: '2rem',
            minTouchTarget: '44px',
            labelMarginBottom: '0.75rem'
        };
    }
}

// Re-render pada resize window
window.addEventListener('resize', () => {
    if (state.view === 'kiosk_select' || state.view === 'kiosk_demographics' || state.view === 'kiosk_vote') {
        render();
    }
});
