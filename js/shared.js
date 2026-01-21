// ============================================
// SHARED CONSTANTS & DATA
// ============================================
const TOTAL_LOKET = 23;
const ADMIN_PIN = '@dmin123';

const EDUCATION_OPTIONS = ['SD', 'SMP', 'SMA', 'D1/D2/D3', 'S1', 'S2/S3'];

const OCCUPATION_OPTIONS = ['PNS/TNI/Polri', 'Karyawan', 'Wiraswasta', 'Pelajar/Mahasiswa', 'Buruh/Tani', 'Lainnya'];

const AGE_RANGES = [
    { label: '17-24 Tahun', min: 17, max: 24 },
    { label: '25-34 Tahun', min: 25, max: 34 },
    { label: '35-44 Tahun', min: 35, max: 44 },
    { label: '45-54 Tahun', min: 45, max: 54 },
    { label: '55-64 Tahun', min: 55, max: 64 },
    { label: '65 Tahun ke atas', min: 65, max: 999 }
];

const LOKET_DATA = [
    { id: 1, name: 'Bank Sumut', logo: 'Logo/1.png' },
    { id: 2, name: 'Polres Asahan', logo: 'Logo/2.png' },
    { id: 3, name: 'Samsat', logo: 'Logo/3.png' },
    { id: 4, name: 'Imigrasi', logo: 'Logo/4.png' },
    { id: 5, name: 'Kementerian Agama', logo: 'Logo/5.png' },
    { id: 6, name: 'Kejaksaan Negeri Kisaran', logo: 'Logo/6.png' },
    { id: 7, name: 'PLN', logo: 'Logo/7.png' },
    { id: 8, name: 'DJP', logo: 'Logo/8.png' },
    { id: 9, name: 'ATR/BPN', logo: 'Logo/9.png' },
    { id: 10, name: 'Dinas Kesehatan', logo: 'Logo/10.png' },
    { id: 11, name: 'BRI', logo: 'Logo/11.png' },
    { id: 12, name: 'Taspen', logo: 'Logo/12.png' },
    { id: 13, name: 'BPJS Ketenagakerjaan', logo: 'Logo/13.png' },
    { id: 14, name: 'Dinas Dukcapil', logo: 'Logo/14.png' },
    { id: 15, name: 'Dispenda', logo: 'Logo/15.png' },
    { id: 16, name: 'Dinas Lingkungan Hidup', logo: 'Logo/16.png' },
    { id: 17, name: 'Dinas PUTR', logo: 'Logo/17.png' },
    { id: 18, name: 'LPSE', logo: 'Logo/18.png' },
    { id: 19, name: 'Perumda Silau Piasa', logo: 'Logo/19.png' },
    { id: 20, name: 'Dinas Sosial', logo: 'Logo/20.png' },
    { id: 21, name: 'Dinas Tenaga Kerja', logo: 'Logo/21.png' },
    { id: 22, name: 'DPMPTSP', logo: 'Logo/22.png' },
    { id: 23, name: 'BPJS Kesehatan', logo: 'Logo/23.png' }
];

const SURVEY_QUESTIONS = [
    {
        id: 'u1',
        text: 'Kesesuaian persyaratan pelayanan?',
        labels: { 1: 'Tidak Sesuai', 2: 'Kurang Sesuai', 3: 'Sesuai', 4: 'Sangat Sesuai' }
    },
    {
        id: 'u2',
        text: 'Kemudahan prosedur pelayanan?',
        labels: { 1: 'Tidak Mudah', 2: 'Kurang Mudah', 3: 'Mudah', 4: 'Sangat Mudah' }
    },
    {
        id: 'u3',
        text: 'Kecepatan waktu pemberian pelayanan?',
        labels: { 1: 'Tidak Cepat', 2: 'Kurang Cepat', 3: 'Cepat', 4: 'Sangat Cepat' }
    },
    {
        id: 'u4',
        text: 'Kewajaran biaya/tarif pelayanan?',
        labels: { 1: 'Sangat Mahal', 2: 'Cukup Mahal', 3: 'Murah', 4: 'Gratis/Sangat Murah' }
    },
    {
        id: 'u5',
        text: 'Kesuaian produk pelayanan?',
        labels: { 1: 'Tidak Sesuai', 2: 'Kurang Sesuai', 3: 'Sesuai', 4: 'Sangat Sesuai' }
    },
    {
        id: 'u6',
        text: 'Kompetensi/kemampuan petugas?',
        labels: { 1: 'Tidak Kompeten', 2: 'Kurang Kompeten', 3: 'Kompeten', 4: 'Sangat Kompeten' }
    },
    {
        id: 'u7',
        text: 'Perilaku kesopanan dan keramahan petugas?',
        labels: { 1: 'Tidak Sopan', 2: 'Kurang Sopan', 3: 'Sopan', 4: 'Sangat Sopan' }
    },
    {
        id: 'u8',
        text: 'Kualitas sarana dan prasarana?',
        labels: { 1: 'Buruk', 2: 'Cukup', 3: 'Baik', 4: 'Sangat Baik' }
    },
    {
        id: 'u9',
        text: 'Penanganan pengaduan dan saran?',
        labels: { 1: 'Tidak Ada', 2: 'Ada Tapi Kurang', 3: 'Berfungsi', 4: 'Dikelola Sangat Baik' }
    }
];

// ============================================
// SHARED UTILITY FUNCTIONS
// ============================================

function getLoketName(loketId) {
    const loket = LOKET_DATA.find(l => l.id === loketId);
    return loket ? loket.name : `Loket ${loketId}`;
}

function getLoketInfo(loketId) {
    return LOKET_DATA.find(l => l.id === loketId) || { id: loketId, name: `Loket ${loketId}`, logo: '' };
}

// ============================================
// SVG ICONS
// ============================================

function SVGIcon(name, size = 24) {
    const icons = {
        heart: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
        smile: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
        meh: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="9" x2="16" y2="9"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`,
        frown: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
        chevronLeft: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
        printer: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`,
        trash: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
        logOut: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`,
        logIn: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`,
        user: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
        graduationCap: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6m0 0a10 10 0 1 1-5.93-9.14"></path><path d="M22 10L12.46 5.5a1 1 0 0 0-.92 0l-9.54 4.5"></path><path d="M9 12v5.94A2 2 0 0 0 10.94 20h2.12A2 2 0 0 0 15 18.94V12"></path></svg>`,
        briefcase: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path></svg>`,
        calendar: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
        arrowRight: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`
    };
    return icons[name] || '';
}
