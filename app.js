
const AppState = {
    staffMode: false,
    dataLoaded: false,
    patients: [],
    currentPatient: null,
    pagination: {
        currentPage: 1,
        itemsPerPage: 10,
        filteredPatients: []
    },
    charts: {
        ageChart: null,
        abnormalChart: null
    }
};

// --- Configuration ---
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKH6BmbFctC-wCBfo0vMYCDfGkwvO9rCSX1vv9AtJgJNysoGptpaKm4rEZrnbRK6CFOuXKGFzOQ4u_/pub?gid=0&single=true&output=csv';
const STAFF_KEY = 'YWRtaW4xMjM0'; // encoded admin1234

// Supabase Configuration
const SUPABASE_URL = 'https://pirjgwpxkvziakoswqeg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcmpnd3hwa3Z6aWFrb3N3cWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NTY2MDAsImV4cCI6MjA5ODAzMjYwMH0.M_RZXbX3aOG1LoWzV3s-JYfoDS2amWF6YelJV_cTpvQ';
let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
function _dk(k){return atob(k);}

// --- Client-side Data Fetching ---
async function getPatientsData() {
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const data = results.data;
                const patients = data.filter(row => row['à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™']).map(row => {
                    const idStr = row['à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™'].toString().trim();
                    let formattedId = idStr;
                    if (idStr.length === 13) {
                        formattedId = `${idStr.charAt(0)}-${idStr.substring(1,5)}-${idStr.substring(5,10)}-${idStr.substring(10,12)}-${idStr.charAt(12)}`;
                    }

                    const weight = parseFloat(row['à¸™à¹‰à¸³à¸«à¸™à¸±à¸']);
                    const heightCm = parseFloat(row['à¸ªà¹ˆà¸§à¸™à¸ªà¸¹à¸‡']);
                    if (!isNaN(weight) && !isNaN(heightCm) && heightCm > 0) {
                        const heightM = heightCm / 100;
                        const calcBMI = (weight / (heightM * heightM)).toFixed(1);
                        if (!row['BMI'] || row['BMI'].toString().trim() === '' || row['BMI'].toString().trim() === '-') {
                            row['BMI'] = calcBMI;
                            const bmiVal = parseFloat(calcBMI);
                            if (bmiVal < 18.5) row['à¹à¸›à¸¥à¸œà¸¥ BMI'] = "à¸™à¹‰à¸³à¸«à¸™à¸±à¸à¸™à¹‰à¸­à¸¢ / à¸œà¸­à¸¡";
                            else if (bmiVal < 23) row['à¹à¸›à¸¥à¸œà¸¥ BMI'] = "à¸›à¸à¸•à¸´ / à¸ªà¸¸à¸‚à¸ à¸²à¸žà¸”à¸µ";
                            else if (bmiVal < 25) row['à¹à¸›à¸¥à¸œà¸¥ BMI'] = "à¸—à¹‰à¸§à¸¡ / à¸­à¹‰à¸§à¸™à¸£à¸°à¸”à¸±à¸š 1";
                            else if (bmiVal < 30) row['à¹à¸›à¸¥à¸œà¸¥ BMI'] = "à¸­à¹‰à¸§à¸™ / à¸­à¹‰à¸§à¸™à¸£à¸°à¸”à¸±à¸š 2";
                            else row['à¹à¸›à¸¥à¸œà¸¥ BMI'] = "à¸­à¹‰à¸§à¸™à¸¡à¸²à¸ / à¸­à¹‰à¸§à¸™à¸£à¸°à¸”à¸±à¸š 3";
                        }
                    }

                    let isHealthy = true;
                    const docOp = row['à¸„à¸§à¸²à¸¡à¹€à¸«à¹‡à¸™à¹à¸žà¸—à¸¢à¹Œ'] || '';
                    const bmiTrans = row['à¹à¸›à¸¥à¸œà¸¥ BMI'] || '';
                    const abnorm = row['à¸•à¸±à¸§à¸œà¸´à¸”à¸›à¸à¸•à¸´+à¹à¸™à¸°à¸™à¸³'] || '';
                    const spec = row['à¸£à¸°à¸šà¸¸(à¸à¸£à¸“à¸µà¸œà¸¥à¸œà¸´à¸”à¸›à¸à¸•à¸´)'] || '';
                    const cxr = row['à¸œà¸¥ CXR'] || '';
                    const ekg = row['à¸œà¸¥ EKG'] || '';
                    const dm = row['à¸„à¸±à¸”à¸à¸£à¸­à¸‡ NCD (DM)'] || '';
                    const ht = row['à¸„à¸±à¸”à¸à¸£à¸­à¸‡ NCD (HT)'] || '';

                    const checkStr = (docOp + ' ' + bmiTrans + ' ' + abnorm + ' ' + spec + ' ' + cxr + ' ' + ekg).toLowerCase();
                    if (checkStr.includes('à¸œà¸´à¸”à¸›à¸à¸•à¸´') || checkStr.includes('à¹à¸™à¸°à¸™à¸³à¸žà¸šà¹à¸žà¸—à¸¢à¹Œ') || checkStr.includes('à¸­à¹‰à¸§à¸™') || checkStr.includes('à¹€à¸ªà¸µà¹ˆà¸¢à¸‡')) {
                        isHealthy = false;
                    }
                    if (dm.includes('à¸œà¸´à¸”à¸›à¸à¸•à¸´')) isHealthy = false;
                    if (ht.includes('à¸œà¸´à¸”à¸›à¸à¸•à¸´')) isHealthy = false;
                    
                    return {
                        id: formattedId,
                        rawId: idStr,
                        hn: row['HN'] ? row['HN'].toString().trim() : '',
                        name: `${row['à¸„à¸³à¸™à¸³à¸«à¸™à¹‰à¸²'] || ''} ${row['à¸Šà¸·à¹ˆà¸­'] || ''} ${row['à¸ªà¸à¸¸à¸¥'] || ''}`.trim(),
                        age: row['à¸­à¸²à¸¢à¸¸'] || '-',
                        gender: (row['à¸„à¸³à¸™à¸³à¸«à¸™à¹‰à¸²'] === 'à¸™à¸²à¸¢' || row['à¸„à¸³à¸™à¸³à¸«à¸™à¹‰à¸²'] === 'à¸”.à¸Š.') ? 'à¸Šà¸²à¸¢' : 'à¸«à¸à¸´à¸‡',
                        isHealthy: isHealthy,
                        rowData: row
                    };
                });
                resolve(patients);
            },
            error: function(err) {
                reject(err);
            }
        });
    });
}

// --- DOM Elements ---
const DOM = {
    loadingOverlay: document.getElementById('loading-overlay'),
    btnPatientView: document.getElementById('btn-patient-view'),
    btnStaffView: document.getElementById('btn-staff-view'),
    staffView: document.getElementById('staff-view'),
    patientView: document.getElementById('patient-view'),
    
    // Staff Login Modal
    staffLoginModal: document.getElementById('staff-login-modal'),
    staffLoginForm: document.getElementById('staff-login-form'),
    staffPasswordInput: document.getElementById('staff-password'),
    staffLoginError: document.getElementById('staff-login-error'),
    
    // Upload UI
    uploadPdfForm: document.getElementById('upload-pdf-form'),
    uploadCitizenId: document.getElementById('upload-citizen-id'),
    uploadDocType: document.getElementById('upload-doc-type'),
    uploadFile: document.getElementById('upload-file'),
    btnUpload: document.getElementById('btn-upload'),
    uploadedFilesList: document.getElementById('uploaded-files-list'),
    
    // Patient Documents
    patientDocumentsSection: document.getElementById('patient-documents-section'),
    patientDocumentsContainer: document.getElementById('patient-documents-container'),
    
    patientLogin: document.getElementById('patient-login'),
    patientDashboard: document.getElementById('patient-dashboard'),
    loginForm: document.getElementById('login-form'),
    citizenIdInput: document.getElementById('citizen-id'),
    patientHnInput: document.getElementById('patient-hn'),
    loginError: document.getElementById('login-error'),
    btnLogout: document.getElementById('btn-logout'),
    btnPdf: document.getElementById('btn-pdf'),
    resultsContainer: document.getElementById('results-container'),
    
    pName: document.getElementById('p-name'),
    pId: document.getElementById('p-id'),
    pAge: document.getElementById('p-age'),
    pGender: document.getElementById('p-gender'),
    pStatusCard: document.getElementById('p-status-card'),
    pSummaryText: document.getElementById('p-summary-text'),
    pStatusBadge: document.getElementById('p-status-badge'),

    kpiTotal: document.getElementById('kpi-total'),
    kpiNcd: document.getElementById('kpi-ncd'),
    kpiLipid: document.getElementById('kpi-lipid'),
    kpiNormal: document.getElementById('kpi-normal'),
    lastUpdate: document.getElementById('last-update'),
    tableSearch: document.getElementById('table-search'),
    tableBody: document.getElementById('patient-table-body'),
    tableCount: document.getElementById('table-count'),
    btnPrevPage: document.getElementById('btn-prev-page'),
    btnNextPage: document.getElementById('btn-next-page')
};

// --- Reference Values & Text ---
const BMI_REF_HTML = `
    <div class="mt-4 text-xs text-gray-600 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
        <p class="font-bold text-navy mb-2"><i class="fa-solid fa-circle-info mr-1"></i> à¹€à¸à¸“à¸‘à¹Œà¸”à¸±à¸Šà¸™à¸µà¸¡à¸§à¸¥à¸à¸²à¸¢ (BMI) à¸ªà¸³à¸«à¸£à¸±à¸šà¸„à¸™à¹€à¸­à¹€à¸Šà¸µà¸¢:</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
            <p><span class="text-blue-600 font-medium w-24 inline-block">< 18.5</span> à¸™à¹‰à¸³à¸«à¸™à¸±à¸à¸™à¹‰à¸­à¸¢ / à¸œà¸­à¸¡</p>
            <p><span class="text-green-600 font-medium w-24 inline-block">18.5 - 22.9</span> à¸›à¸à¸•à¸´ / à¸ªà¸¸à¸‚à¸ à¸²à¸žà¸”à¸µ</p>
            <p><span class="text-yellow-600 font-medium w-24 inline-block">23.0 - 24.9</span> à¸—à¹‰à¸§à¸¡ / à¸­à¹‰à¸§à¸™à¸£à¸°à¸”à¸±à¸š 1</p>
            <p><span class="text-orange-600 font-medium w-24 inline-block">25.0 - 29.9</span> à¸­à¹‰à¸§à¸™ / à¸­à¹‰à¸§à¸™à¸£à¸°à¸”à¸±à¸š 2</p>
            <p><span class="text-red-600 font-medium w-24 inline-block">>= 30.0</span> à¸­à¹‰à¸§à¸™à¸¡à¸²à¸ / à¸­à¹‰à¸§à¸™à¸£à¸°à¸”à¸±à¸š 3</p>
        </div>
    </div>
`;

const LAB_REFERENCES = []; // Deprecated in favor of inline normal ranges in GROUPS

const GROUPS = [
    { id: 'vitals', title: '1. à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸žà¸·à¹‰à¸™à¸à¸²à¸™à¹à¸¥à¸°à¸ªà¸±à¸à¸à¸²à¸“à¸Šà¸µà¸ž', icon: 'fa-heart-pulse', fields: [
        { key: 'BMI', label: 'à¸”à¸±à¸Šà¸™à¸µà¸¡à¸§à¸¥à¸à¸²à¸¢ (BMI)', valueKey: 'BMI', descKey: 'à¹à¸›à¸¥à¸œà¸¥ BMI', refHtml: BMI_REF_HTML, normal: '18.5 - 22.9' },
        { key: 'BP', label: 'à¸„à¸§à¸²à¸¡à¸”à¸±à¸™à¹‚à¸¥à¸«à¸´à¸• (BP)', valueKey: 'à¸„à¸§à¸²à¸¡à¸”à¸±à¸™', descKey: null },
        { key: 'P', label: 'à¸Šà¸µà¸žà¸ˆà¸£ (Pulse)', valueKey: 'à¸Šà¸µà¸žà¸ˆà¸£', descKey: null },
        { key: 'Waist', label: 'à¸™à¹‰à¸³à¸«à¸™à¸±à¸ / à¸ªà¹ˆà¸§à¸™à¸ªà¸¹à¸‡', valueKey: (row) => {
            if(!row['à¸™à¹‰à¸³à¸«à¸™à¸±à¸'] && !row['à¸ªà¹ˆà¸§à¸™à¸ªà¸¹à¸‡']) return '-';
            return `à¸™à¹‰à¸³à¸«à¸™à¸±à¸ ${row['à¸™à¹‰à¸³à¸«à¸™à¸±à¸']||'-'} à¸à¸. / à¸ªà¹ˆà¸§à¸™à¸ªà¸¹à¸‡ ${row['à¸ªà¹ˆà¸§à¸™à¸ªà¸¹à¸‡']||'-'} à¸‹à¸¡.`;
        }, descKey: null }
    ]},
    { id: 'cbc', title: '2. à¸œà¸¥à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸„à¸§à¸²à¸¡à¸ªà¸¡à¸šà¸¹à¸£à¸“à¹Œà¸‚à¸­à¸‡à¹€à¸¥à¸·à¸­à¸”', icon: 'fa-droplet', fields: [
        { key: 'CBC', label: 'à¸„à¸§à¸²à¸¡à¸ªà¸¡à¸šà¸¹à¸£à¸“à¹Œà¸‚à¸­à¸‡à¹€à¸¥à¸·à¸­à¸” (CBC)', valueKey: 'CBC', descKey: null }
    ]},
    { id: 'ncd_blood', title: '3. à¸œà¸¥à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¹€à¸¥à¸·à¸­à¸”à¹‚à¸£à¸„ NCD (à¹€à¸šà¸²à¸«à¸§à¸²à¸™, à¹€à¸à¹Šà¸²à¸—à¹Œ, à¹„à¸‚à¸¡à¸±à¸™)', icon: 'fa-syringe', fields: [
        { key: 'HT', label: 'à¸à¸²à¸£à¸„à¸±à¸”à¸à¸£à¸­à¸‡à¸„à¸§à¸²à¸¡à¸”à¸±à¸™à¹‚à¸¥à¸«à¸´à¸•à¸ªà¸¹à¸‡', valueKey: 'à¸„à¸±à¸”à¸à¸£à¸­à¸‡ NCD (HT)', descKey: null },
        { key: 'FBS', label: 'à¸™à¹‰à¸³à¸•à¸²à¸¥à¹ƒà¸™à¹€à¸¥à¸·à¸­à¸” (FBS)', valueKey: 'FBS', normal: '70 - 99 mg/dL' },
        { key: 'HbA1c', label: 'à¸™à¹‰à¸³à¸•à¸²à¸¥à¸ªà¸°à¸ªà¸¡ (HbA1c)', valueKey: 'HbA1c', normal: '< 5.7 %' },
        { key: 'Uric acid', label: 'à¸à¸£à¸”à¸¢à¸¹à¸£à¸´à¸ (Uric acid)', valueKey: 'Uric_acid', normal: '3.4 - 7.0 mg/dL (à¸Šà¸²à¸¢), 2.4 - 5.7 mg/dL (à¸«à¸à¸´à¸‡)' },
        { key: 'Total Cholesterol', label: 'à¸„à¸­à¹€à¸¥à¸ªà¹€à¸•à¸­à¸£à¸­à¸¥à¸£à¸§à¸¡ (TC)', valueKey: 'Total_Cholesterol', normal: '< 200 mg/dL' },
        { key: 'Triglyceride', label: 'à¹„à¸•à¸£à¸à¸¥à¸µà¹€à¸‹à¸­à¹„à¸£à¸”à¹Œ (TG)', valueKey: 'Triglyceride', normal: '< 150 mg/dL' },
        { key: 'HDL', label: 'à¹„à¸‚à¸¡à¸±à¸™à¸”à¸µ (HDL)', valueKey: 'HDL', normal: '> 40 mg/dL (à¸Šà¸²à¸¢), > 50 mg/dL (à¸«à¸à¸´à¸‡)' },
        { key: 'LDL', label: 'à¹„à¸‚à¸¡à¸±à¸™à¹€à¸¥à¸§ (LDL)', valueKey: 'LDL', normal: '< 100 mg/dL' }
    ]},
    { id: 'kidney', title: '4. à¸œà¸¥à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸à¸²à¸£à¸—à¸³à¸‡à¸²à¸™à¸‚à¸­à¸‡à¹„à¸•', icon: 'fa-flask', fields: [
        { key: 'BUN', label: 'à¸„à¹ˆà¸²à¸à¸²à¸£à¸—à¸³à¸‡à¸²à¸™à¸‚à¸­à¸‡à¹„à¸• (BUN)', valueKey: 'BUN', normal: '7 - 20 mg/dL' },
        { key: 'Creatinine', label: 'à¸„à¹ˆà¸²à¸à¸²à¸£à¸—à¸³à¸‡à¸²à¸™à¸‚à¸­à¸‡à¹„à¸• (Creatinine)', valueKey: 'Creatinine', normal: '0.6 - 1.2 mg/dL' }
    ]},
    { id: 'liver', title: '5. à¸œà¸¥à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸à¸²à¸£à¸—à¸³à¸‡à¸²à¸™à¸‚à¸­à¸‡à¸•à¸±à¸š', icon: 'fa-vials', fields: [
        { key: 'SGOT (AST)', label: 'à¹€à¸­à¸™à¹„à¸‹à¸¡à¹Œà¸•à¸±à¸š (SGOT/AST)', valueKey: 'SGOT', normal: '0 - 40 U/L' },
        { key: 'SGPT (ALT)', label: 'à¹€à¸­à¸™à¹„à¸‹à¸¡à¹Œà¸•à¸±à¸š (SGPT/ALT)', valueKey: 'SGPT', normal: '0 - 41 U/L' },
        { key: 'Alk. Phosphatase', label: 'à¹€à¸­à¸™à¹„à¸‹à¸¡à¹Œà¸•à¸±à¸š (Alk. Phosphatase)', valueKey: 'Alk_Phosphatase', normal: '40 - 129 U/L' }
    ]},
    { id: 'tumor', title: '6. à¸œà¸¥à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸²à¸£à¸šà¹ˆà¸‡à¸Šà¸µà¹‰à¸¡à¸°à¹€à¸£à¹‡à¸‡', icon: 'fa-virus', fields: [
        { key: 'AFP', label: 'à¸ªà¸²à¸£à¸šà¹ˆà¸‡à¸Šà¸µà¹‰à¸¡à¸°à¹€à¸£à¹‡à¸‡à¸•à¸±à¸š (AFP)', valueKey: 'AFP', normal: '< 8.0 ng/mL' },
        { key: 'CEA', label: 'à¸ªà¸²à¸£à¸šà¹ˆà¸‡à¸Šà¸µà¹‰à¸¡à¸°à¹€à¸£à¹‡à¸‡à¸—à¸²à¸‡à¹€à¸”à¸´à¸™à¸­à¸²à¸«à¸²à¸£ (CEA)', valueKey: 'CEA', normal: '< 5.0 ng/mL' },
        { key: 'CA 125', label: 'à¸ªà¸²à¸£à¸šà¹ˆà¸‡à¸Šà¸µà¹‰à¸¡à¸°à¹€à¸£à¹‡à¸‡à¸£à¸±à¸‡à¹„à¸‚à¹ˆ (CA 125)', valueKey: 'CA_125', normal: '< 35 U/mL' },
        { key: 'CA199', label: 'à¸ªà¸²à¸£à¸šà¹ˆà¸‡à¸Šà¸µà¹‰à¸¡à¸°à¹€à¸£à¹‡à¸‡à¸•à¸±à¸šà¸­à¹ˆà¸­à¸™ (CA199)', valueKey: 'CA199', normal: '< 37 U/mL' },
        { key: 'PSA', label: 'à¸ªà¸²à¸£à¸šà¹ˆà¸‡à¸Šà¸µà¹‰à¸¡à¸°à¹€à¸£à¹‡à¸‡à¸•à¹ˆà¸­à¸¡à¸¥à¸¹à¸à¸«à¸¡à¸²à¸ (PSA)', valueKey: 'PSA', normal: '< 4.0 ng/mL' }
    ]},
    { id: 'thyroid_immuno', title: '7. à¸œà¸¥à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¹„à¸—à¸£à¸­à¸¢à¸”à¹Œà¹à¸¥à¸°à¸ à¸¹à¸¡à¸´à¸„à¸¸à¹‰à¸¡à¸à¸±à¸™', icon: 'fa-shield-virus', fields: [
        { key: 'Free T3', label: 'à¸®à¸­à¸£à¹Œà¹‚à¸¡à¸™à¹„à¸—à¸£à¸­à¸¢à¸”à¹Œ (Free T3)', valueKey: 'Free_T3', normal: '2.0 - 4.4 pg/mL' },
        { key: 'Free T4', label: 'à¸®à¸­à¸£à¹Œà¹‚à¸¡à¸™à¹„à¸—à¸£à¸­à¸¢à¸”à¹Œ (Free T4)', valueKey: 'Free_T4', normal: '0.82 - 1.77 ng/dL' },
        { key: 'TSH', label: 'à¸®à¸­à¸£à¹Œà¹‚à¸¡à¸™à¹„à¸—à¸£à¸­à¸¢à¸”à¹Œ (TSH)', valueKey: 'TSH', normal: '0.4 - 4.0 mIU/L' },
        { key: 'HbsAg', label: 'à¹€à¸Šà¸·à¹‰à¸­à¹„à¸§à¸£à¸±à¸ªà¸•à¸±à¸šà¸­à¸±à¸à¹€à¸ªà¸š à¸šà¸µ (HbsAg)', valueKey: 'HbsAg', normal: 'Negative' },
        { key: 'HbsAb', label: 'à¸ à¸¹à¸¡à¸´à¸„à¸¸à¹‰à¸¡à¸à¸±à¸™à¹„à¸§à¸£à¸±à¸ªà¸•à¸±à¸šà¸­à¸±à¸à¹€à¸ªà¸š à¸šà¸µ (HbsAb)', valueKey: 'HbsAb', normal: 'Negative' },
        { key: 'Anti-HCV', label: 'à¸ à¸¹à¸¡à¸´à¸„à¸¸à¹‰à¸¡à¸à¸±à¸™à¹„à¸§à¸£à¸±à¸ªà¸•à¸±à¸šà¸­à¸±à¸à¹€à¸ªà¸š à¸‹à¸µ (Anti-HCV)', valueKey: 'Anti_HCV', normal: 'Negative' },
        { key: 'Blood group', label: 'à¸«à¸¡à¸¹à¹ˆà¹€à¸¥à¸·à¸­à¸” (Blood group)', valueKey: 'Blood group', normal: null }
    ]},
    { id: 'ua', title: '8. à¸œà¸¥à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸›à¸±à¸ªà¸ªà¸²à¸§à¸°', icon: 'fa-vial', fields: [
        { key: 'UA', label: 'à¸›à¸±à¸ªà¸ªà¸²à¸§à¸° (UA)', valueKey: 'UA', descKey: null, normal: '0 - 5' }
    ]},
    { id: 'stool', title: '9. à¸œà¸¥à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸­à¸¸à¸ˆà¸ˆà¸²à¸£à¸°', icon: 'fa-poop', fields: [
        { key: 'Stool Exam', label: 'à¸­à¸¸à¸ˆà¸ˆà¸²à¸£à¸° (Stool Exam)', valueKey: 'Stool_Exam', descKey: null },
        { key: 'Stool occult blood', label: 'à¹€à¸¥à¸·à¸­à¸”à¹à¸à¸‡à¹ƒà¸™à¸­à¸¸à¸ˆà¸ˆà¸²à¸£à¸° (Stool occult blood)', valueKey: 'à¹€à¸¥à¸·à¸­à¸”à¹à¸à¸‡à¹ƒà¸™à¸­à¸¸à¸ˆà¸ˆà¸²à¸£à¸°', descKey: null }
    ]},
    { id: 'special_exams', title: '10. à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸žà¸´à¹€à¸¨à¸© (X-Ray, EKG, à¸­à¸±à¸¥à¸•à¸£à¸²à¸‹à¸²à¸§à¸”à¹Œ, à¸¯à¸¥à¸¯)', icon: 'fa-x-ray', fields: [
        { key: 'Physical examination', label: 'à¸‹à¸±à¸à¸›à¸£à¸°à¸§à¸±à¸•à¸´ à¸•à¸£à¸§à¸ˆà¸£à¹ˆà¸²à¸‡à¸à¸²à¸¢', valueKey: 'Physical_exam', descKey: null },
        { key: 'Chest X-Ray', label: 'à¹€à¸­à¸à¸‹à¹€à¸£à¸¢à¹Œà¸›à¸­à¸” (Chest X-Ray)', valueKey: 'Chest_X_Ray', descKey: null },
        { key: 'EKG', label: 'à¸„à¸¥à¸·à¹ˆà¸™à¹„à¸Ÿà¸Ÿà¹‰à¸²à¸«à¸±à¸§à¹ƒà¸ˆ (EKG)', valueKey: 'EKG', descKey: null },
        { key: 'Ultrasound', label: 'à¸­à¸±à¸¥à¸•à¸£à¸²à¸‹à¸²à¸§à¸”à¹Œà¸Šà¹ˆà¸­à¸‡à¸—à¹‰à¸­à¸‡ (Ultrasound)', valueKey: 'Ultrasound', descKey: null },
        { key: 'à¸•à¸£à¸§à¸ˆà¸¡à¸°à¹€à¸£à¹‡à¸‡à¸›à¸²à¸à¸¡à¸”à¸¥à¸¹à¸', label: 'à¸•à¸£à¸§à¸ˆà¸ à¸²à¸¢à¹ƒà¸™ (Pap smear)', valueKey: 'à¸•à¸£à¸§à¸ˆà¸¡à¸°à¹€à¸£à¹‡à¸‡à¸›à¸²à¸à¸¡à¸”à¸¥à¸¹à¸', descKey: null },
        { key: 'HPV DNA Test', label: 'à¸¡à¸°à¹€à¸£à¹‡à¸‡à¸›à¸²à¸à¸¡à¸”à¸¥à¸¹à¸à¸£à¸°à¸”à¸±à¸šà¸žà¸±à¸™à¸˜à¸¸à¸à¸£à¸£à¸¡ (HPV DNA)', valueKey: 'HPV DNA Test', descKey: null },
        { key: 'Bone Density', label: 'à¸ à¸²à¸§à¸°à¸à¸£à¸°à¸”à¸¹à¸à¸žà¸£à¸¸à¸™ (Bone Density)', valueKey: 'Bone Density', descKey: null },
        { key: 'Body Composition Analyzer', label: 'à¸­à¸‡à¸„à¹Œà¸›à¸£à¸°à¸à¸­à¸šà¸£à¹ˆà¸²à¸‡à¸à¸²à¸¢', valueKey: 'Body Composition Analyzer', descKey: null },
        { key: 'Low Dose CT scan', label: 'à¸„à¸±à¸”à¸à¸£à¸­à¸‡à¸¡à¸°à¹€à¸£à¹‡à¸‡à¸›à¸­à¸” (Low Dose CT scan)', valueKey: 'Low Dose CT scan', descKey: null }
    ]},
    { id: 'mental_health', title: '11. à¸à¸²à¸£à¸›à¸£à¸°à¹€à¸¡à¸´à¸™à¸ à¸²à¸§à¸°à¸ªà¸¸à¸‚à¸ à¸²à¸žà¸ˆà¸´à¸• (2Q)', icon: 'fa-brain', fields: [
        { key: '2Q', label: 'à¸œà¸¥à¸à¸²à¸£à¸„à¸±à¸”à¸à¸£à¸­à¸‡à¹‚à¸£à¸„à¸‹à¸¶à¸¡à¹€à¸¨à¸£à¹‰à¸² (2Q)', valueKey: '2Q', descKey: null }
    ]},
    { id: 'summary', title: '12. à¸ªà¸£à¸¸à¸›à¸„à¸§à¸²à¸¡à¹€à¸«à¹‡à¸™à¹à¸žà¸—à¸¢à¹Œà¹à¸¥à¸°à¸à¸²à¸£à¸•à¸´à¸”à¸•à¸²à¸¡à¸œà¸¥', icon: 'fa-user-doctor', fields: [
        { key: 'Doctor', label: 'à¸„à¸§à¸²à¸¡à¹€à¸«à¹‡à¸™à¹à¸žà¸—à¸¢à¹Œ', valueKey: 'à¸„à¸§à¸²à¸¡à¹€à¸«à¹‡à¸™à¹à¸žà¸—à¸¢à¹Œ', descKey: null },
        { key: 'FU', label: 'à¸à¸²à¸£à¸•à¸´à¸”à¸•à¸²à¸¡à¸œà¸¥ (Follow-up)', valueKey: (row) => {
            const fu = row['Follow up à¹€à¸£à¸·à¹ˆà¸­à¸‡'];
            const dur = row['à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸² Follow up'];
            const validFu = fu && fu.trim() !== '' && fu.trim() !== '-';
            const validDur = dur && dur.trim() !== '' && dur.trim() !== '-';
            
            if (!validFu && !validDur) return '-';
            
            let result = [];
            if (validFu) result.push(`à¹€à¸£à¸·à¹ˆà¸­à¸‡: ${fu}`);
            if (validDur) result.push(`à¸£à¸°à¸¢à¸°à¹€à¸§à¸¥à¸²: ${dur}`);
            return result.join(' | ');
        }, descKey: null }
    ]}
];

// Determine if we are on the staff page based on URL
const isStaffPage = window.location.pathname.includes('staff.html');

// --- Initialization ---
async function init() {
    setupEventListeners();
    try {
        if (isStaffPage) {
            AppState.staffMode = true;
            await authenticateStaff();
        } else {
            AppState.staffMode = false;
            AppState.dataLoaded = true;
            if(DOM.loadingOverlay) DOM.loadingOverlay.classList.add('hidden');
        }
        
        if(DOM.lastUpdate) DOM.lastUpdate.textContent = new Date().toLocaleString('th-TH');
        updateViewMode();
        
    } catch (error) {
        console.error("Failed to initialize:", error);
        if(DOM.loadingOverlay) DOM.loadingOverlay.innerHTML = '<p class="text-red-500 font-bold">à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¹€à¸‹à¸´à¸£à¹Œà¸Ÿà¹€à¸§à¸­à¸£à¹Œ</p>';
    }
}

async function authenticateStaff() {
    // We don't use prompt() anymore. We wait for the modal form submission.
    if (DOM.staffLoginModal) {
        DOM.staffLoginModal.classList.remove('hidden');
        if (DOM.loadingOverlay) DOM.loadingOverlay.classList.add('hidden');
    }
}

// --- Data Fetching (Client-Side) ---

// --- Event Listeners ---
function setupEventListeners() {
    if(DOM.btnPatientView) {
        DOM.btnPatientView.addEventListener('click', () => {
            AppState.staffMode = false;
            updateViewMode();
        });
    }
    if(DOM.btnStaffView) {
        DOM.btnStaffView.addEventListener('click', () => {
            AppState.staffMode = true;
            updateViewMode();
        });
    }
    if(DOM.loginForm) DOM.loginForm.addEventListener('submit', handleLogin);
    if(DOM.citizenIdInput) {
        DOM.citizenIdInput.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\\D/g, '');
            if (val.length > 13) val = val.substring(0, 13);
            e.target.value = val;
        });
    }
    if(DOM.btnLogout) {
        DOM.btnLogout.addEventListener('click', () => {
            AppState.currentPatient = null;
            if (isStaffPage) {
                // If on staff page, logout means go back to staff dashboard
                AppState.staffMode = true;
                updateViewMode();
            } else {
                DOM.patientLogin.classList.remove('hidden');
                DOM.patientDashboard.classList.add('hidden');
                DOM.citizenIdInput.value = '';
                if(DOM.loginError) DOM.loginError.classList.add('hidden');
            }
        });
    }

    if(DOM.tableSearch) {
        DOM.tableSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().replace(/-/g, '');
            AppState.pagination.filteredPatients = AppState.patients.filter(p => 
                p.rawId.includes(term) || p.name.toLowerCase().includes(term)
            );
            AppState.pagination.currentPage = 1;
            renderStaffTable();
        });
    }
    if(DOM.btnPrevPage) DOM.btnPrevPage.addEventListener('click', () => {
        if (AppState.pagination.currentPage > 1) {
            AppState.pagination.currentPage--;
            renderStaffTable();
        }
    });
    if(DOM.btnNextPage) DOM.btnNextPage.addEventListener('click', () => {
        const maxPage = Math.ceil(AppState.pagination.filteredPatients.length / AppState.pagination.itemsPerPage);
        if (AppState.pagination.currentPage < maxPage) {
            AppState.pagination.currentPage++;
            renderStaffTable();
        }
    });

    if (DOM.staffLoginForm) {
        DOM.staffLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pwd = DOM.staffPasswordInput.value;
            if (pwd === _dk(STAFF_KEY)) {
                if(DOM.staffLoginError) DOM.staffLoginError.classList.add('hidden');
                if (DOM.loadingOverlay) {
                    DOM.loadingOverlay.classList.remove('hidden');
                    DOM.loadingOverlay.innerHTML = `
                        <i class="fa-solid fa-circle-notch fa-spin text-5xl text-blue-500"></i>
                        <p class="mt-4 text-navy font-medium animate-pulse">à¸à¸³à¸¥à¸±à¸‡à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹à¸¥à¸°à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸°à¸šà¸š...</p>
                    `;
                }
                
                try {
                    const data = await getPatientsData();
                    AppState.patients = data;
                    AppState.pagination.filteredPatients = [...AppState.patients];
                    AppState.dataLoaded = true;
                    DOM.staffLoginModal.classList.add('hidden');
                    if(DOM.loadingOverlay) DOM.loadingOverlay.classList.add('hidden');
                    updateViewMode();
                } catch (error) {
                    console.error("Staff auth error:", error);
                    if (DOM.staffLoginError) {
                        DOM.staffLoginError.innerHTML = '<i class="fa-solid fa-triangle-exclamation mr-1"></i> à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”à¹ƒà¸™à¸à¸²à¸£à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥';
                        DOM.staffLoginError.classList.remove('hidden');
                    }
                    if(DOM.loadingOverlay) DOM.loadingOverlay.classList.add('hidden');
                }
            } else {
                if(DOM.staffLoginError) {
                    DOM.staffLoginError.innerHTML = '<i class="fa-solid fa-triangle-exclamation mr-1"></i> à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡';
                    DOM.staffLoginError.classList.remove('hidden');
                }
            }
        });
    }

    if (DOM.uploadPdfForm) {
        DOM.uploadPdfForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!supabaseClient) {
                Swal.fire({ icon: 'error', title: 'à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹„à¸”à¹‰', text: 'à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¹€à¸Šà¸·à¹ˆà¸­à¸¡à¸•à¹ˆà¸­à¸à¸±à¸š Supabase' });
                return;
            }
            
            const citizenId = DOM.uploadCitizenId.value;
            const docType = DOM.uploadDocType.value;
            const file = DOM.uploadFile.files[0];
            
            if (!citizenId || !docType || !file) return;
            
            DOM.btnUpload.disabled = true;
            DOM.btnUpload.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> à¸à¸³à¸¥à¸±à¸‡à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”...';
            
            try {
                // Upload to Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${citizenId}_${docType.replace(/ /g, '_')}_${Date.now()}.${fileExt}`;
                const filePath = `${citizenId}/${fileName}`;
                
                const { data: uploadData, error: uploadError } = await supabaseClient
                    .storage
                    .from('patient_documents')
                    .upload(filePath, file);
                    
                if (uploadError) throw uploadError;
                
                // Get Public URL
                const { data: urlData } = supabaseClient
                    .storage
                    .from('patient_documents')
                    .getPublicUrl(filePath);
                
                const fileUrl = urlData.publicUrl;
                
                // Insert into Database
                const { error: dbError } = await supabaseClient
                    .from('patient_files')
                    .insert({
                        citizen_id: citizenId,
                        document_type: docType,
                        file_url: fileUrl,
                        file_name: file.name
                    });
                    
                if (dbError) throw dbError;
                
                Swal.fire({
                    icon: 'success',
                    title: 'à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸ªà¸³à¹€à¸£à¹‡à¸ˆ',
                    text: `à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œ ${docType} à¸‚à¸­à¸‡à¸œà¸¹à¹‰à¸›à¹ˆà¸§à¸¢à¹€à¸£à¸µà¸¢à¸šà¸£à¹‰à¸­à¸¢à¹à¸¥à¹‰à¸§`,
                    confirmButtonColor: '#2563eb'
                });
                
                DOM.uploadPdfForm.reset();
                DOM.uploadCitizenId.value = citizenId; 
                
                fetchStaffUploadedFiles(citizenId);
                
            } catch (error) {
                console.error('Upload Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'à¹€à¸à¸´à¸”à¸‚à¹‰à¸­à¸œà¸´à¸”à¸žà¸¥à¸²à¸”',
                    text: error.message || 'à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œà¹„à¸”à¹‰',
                });
            } finally {
                DOM.btnUpload.disabled = false;
                DOM.btnUpload.innerHTML = '<i class="fa-solid fa-upload mr-2"></i> à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œ';
            }
        });
    }
}

function updateViewMode() {
    if (AppState.staffMode) {
        if(DOM.patientView) DOM.patientView.classList.add('hidden');
        if(DOM.staffView) DOM.staffView.classList.remove('hidden');
        if(DOM.btnStaffView) {
            DOM.btnStaffView.classList.replace('text-white', 'bg-white');
            DOM.btnStaffView.classList.replace('hover:text-blue-200', 'text-navy');
        }
        if(DOM.btnPatientView) {
            DOM.btnPatientView.classList.replace('bg-white', 'text-white');
            DOM.btnPatientView.classList.replace('text-navy', 'hover:text-blue-200');
        }
        renderStaffDashboard();
    } else {
        if(DOM.staffView) DOM.staffView.classList.add('hidden');
        if(DOM.patientView) DOM.patientView.classList.remove('hidden');
        if(DOM.btnPatientView) {
            DOM.btnPatientView.classList.replace('text-white', 'bg-white');
            DOM.btnPatientView.classList.replace('hover:text-blue-200', 'text-navy');
        }
        if(DOM.btnStaffView) {
            DOM.btnStaffView.classList.replace('bg-white', 'text-white');
            DOM.btnStaffView.classList.replace('text-navy', 'hover:text-blue-200');
        }
    }
}

// --- Text Formatting Helpers ---
function formatDoctorOpinion(text) {
    if (!text || text === '-') return '-';
    // Split by dashes that indicate new bullet points
    // This regex looks for ' - ', or '- ' at the start of a string
    let parts = text.split(/(?:\s-\s|^-\s|^-)/).filter(p => p.trim() !== '');
    if (parts.length > 1 || text.trim().startsWith('-')) {
        return `<ul class="list-disc pl-5 space-y-3 mt-2 text-gray-700">` + 
               parts.map(p => `<li class="leading-relaxed">${p.trim()}</li>`).join('') + 
               `</ul>`;
    }
    return `<p class="leading-relaxed text-gray-700">${text}</p>`;
}

// --- Patient Portal Logic ---
async function handleLogin(e) {
    e.preventDefault();
    const inputId = DOM.citizenIdInput.value.replace(/-/g, '');
    const hn = DOM.patientHnInput.value.trim();

    if(DOM.loginError) DOM.loginError.classList.add('hidden');
    
    // Show loading state on button
    const btn = e.target.querySelector('button[type="submit"]');
    const originalBtnHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> à¸à¸³à¸¥à¸±à¸‡à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸š...';
    btn.disabled = true;

    try {
        const patients = await getPatientsData();
        const patient = patients.find(p => p.rawId === inputId && p.hn === hn);

        if (patient) {
            viewPatient(patient);
        } else {
            if(DOM.loginError) {
                DOM.loginError.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1"></i>à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸™à¸£à¸°à¸šà¸š à¸à¸£à¸¸à¸“à¸²à¸•à¸£à¸§à¸ˆà¸ªà¸­à¸šà¹€à¸¥à¸‚à¸›à¸£à¸°à¸ˆà¸³à¸•à¸±à¸§à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™ à¹à¸¥à¸° HN à¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡`;
                DOM.loginError.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error("Login error:", error);
        if(DOM.loginError) {
            DOM.loginError.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1"></i>à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸”à¹‰ à¸à¸£à¸¸à¸“à¸²à¸¥à¸­à¸‡à¹ƒà¸«à¸¡à¹ˆà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡`;
            DOM.loginError.classList.remove('hidden');
        }
    } finally {
        btn.innerHTML = originalBtnHTML;
        btn.disabled = false;
    }
}

function viewPatient(patient) {
    AppState.currentPatient = patient;
    if(DOM.loginError) DOM.loginError.classList.add('hidden');
    if(DOM.patientLogin) DOM.patientLogin.classList.add('hidden');
    
    if (isStaffPage) {
        AppState.staffMode = false;
        updateViewMode();
        DOM.btnLogout.innerHTML = '<i class="fa-solid fa-arrow-left mr-2"></i> à¸à¸¥à¸±à¸šà¸«à¸™à¹‰à¸²à¹à¸”à¸Šà¸šà¸­à¸£à¹Œà¸”';
        
        // Setup staff upload form
        if(DOM.uploadCitizenId) DOM.uploadCitizenId.value = patient.rawId;
        fetchStaffUploadedFiles(patient.rawId);
        
    } else {
        DOM.patientDashboard.classList.remove('hidden');
        DOM.btnLogout.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket mr-2"></i> à¸­à¸­à¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š';
        
        // Fetch patient documents
        fetchPatientDocuments(patient.rawId);
    }
    
    renderPatientDashboard();
}

function renderPatientDashboard() {
    const p = AppState.currentPatient;
    if(!p) return;
    
    // Header
    if(DOM.pName) DOM.pName.textContent = p.name;
    if(DOM.pId) DOM.pId.textContent = p.id;
    if(DOM.pAge) DOM.pAge.textContent = p.age;
    if(DOM.pGender) DOM.pGender.textContent = p.gender;

    // PDF Button
    if(DOM.btnPdf) {
        const pdfUrl = p.rowData['Merged Doc URL - Summary report'];
        if (pdfUrl && pdfUrl !== '-' && pdfUrl.startsWith('http')) {
            DOM.btnPdf.href = pdfUrl;
            DOM.btnPdf.classList.remove('hidden');
        } else {
            DOM.btnPdf.classList.add('hidden');
        }
    }
    
    // Status Card
    const rawOpinion = p.rowData['à¸„à¸§à¸²à¸¡à¹€à¸«à¹‡à¸™à¹à¸žà¸—à¸¢à¹Œ'];
    let formattedOpinion = formatDoctorOpinion(rawOpinion);
    
    const doctorOpinionHtml = (rawOpinion && rawOpinion !== '-') 
        ? formattedOpinion 
        : (p.isHealthy ? 'à¸¢à¸´à¸™à¸”à¸µà¸”à¹‰à¸§à¸¢! à¸ à¸²à¸žà¸£à¸§à¸¡à¸œà¸¥à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸¸à¸‚à¸ à¸²à¸žà¸‚à¸­à¸‡à¸„à¸¸à¸“à¸­à¸¢à¸¹à¹ˆà¹ƒà¸™à¹€à¸à¸“à¸‘à¹Œà¸¡à¸²à¸•à¸£à¸à¸²à¸™' : 'à¸žà¸šà¸„à¹ˆà¸²à¸œà¸¥à¸•à¸£à¸§à¸ˆà¸šà¸²à¸‡à¸£à¸²à¸¢à¸à¸²à¸£à¸­à¸¢à¸¹à¹ˆà¸™à¸­à¸à¹€à¸à¸“à¸‘à¹Œà¸¡à¸²à¸•à¸£à¸à¸²à¸™ à¹à¸™à¸°à¸™à¸³à¹ƒà¸«à¹‰à¸›à¸à¸´à¸šà¸±à¸•à¸´à¸•à¸²à¸¡à¸„à¸³à¹à¸™à¸°à¸™à¸³à¸­à¸¢à¹ˆà¸²à¸‡à¹€à¸„à¸£à¹ˆà¸‡à¸„à¸£à¸±à¸”');

    if(DOM.pStatusCard) {
        DOM.pStatusCard.classList.add('hidden');
    }
    
    if(DOM.resultsContainer) {
        DOM.resultsContainer.innerHTML = '';
        
        GROUPS.forEach(group => {
            let hasContent = false;
            let groupAbnormal = false;
            
            const fieldsHTML = group.fields.map(field => {
                const html = renderTestRow(field, p.rowData);
                if(html.includes('fa-circle-xmark')) groupAbnormal = true;
                if(!html.includes('à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸•à¸£à¸§à¸ˆ')) hasContent = true;
                return html;
            }).join('');
            
            const statusDot = groupAbnormal 
                ? `<span class="flex h-3 w-3 relative ml-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>`
                : (hasContent ? `<span class="ml-3 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">à¸›à¸à¸•à¸´</span>` : '');

            const accordionHTML = `
                <div class="glass-card rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-200">
                    <button class="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors focus:outline-none" onclick="toggleAccordion('${group.id}')">
                        <div class="flex items-center">
                            <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-navy shadow-inner shrink-0">
                                <i class="fa-solid ${group.icon}"></i>
                            </div>
                            <span class="ml-4 font-bold text-gray-800 text-left text-sm md:text-base">${group.title}</span>
                            ${statusDot}
                        </div>
                        <i class="fa-solid fa-chevron-down text-gray-400 accordion-icon" id="icon-${group.id}"></i>
                    </button>
                    <div class="accordion-content bg-slate-50 border-t border-gray-100 px-2 sm:px-6" id="content-${group.id}">
                        <div class="space-y-3 pb-2 pt-1">
                            ${fieldsHTML}
                        </div>
                    </div>
                </div>
            `;
            DOM.resultsContainer.insertAdjacentHTML('beforeend', accordionHTML);
        });

        // Add Doctor Signature Block
        const doctorName = p.rowData['à¹à¸žà¸—à¸¢à¹Œà¸œà¸¹à¹‰à¹à¸›à¸¥à¸œà¸¥'];
        if (doctorName && doctorName.trim() !== '' && doctorName.trim() !== '-') {
            const signatureHTML = `
                <div class="mt-8 text-right p-6 bg-white rounded-2xl shadow-sm border border-gray-100 break-inside-avoid">
                    <p class="text-gray-600 mb-2 text-sm md:text-base">à¹à¸žà¸—à¸¢à¹Œà¸œà¸¹à¹‰à¹à¸›à¸¥à¸œà¸¥à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸ªà¸¸à¸‚à¸ à¸²à¸ž</p>
                    <p class="text-lg md:text-xl font-bold text-navy">( ${doctorName} )</p>
                </div>
            `;
            DOM.resultsContainer.insertAdjacentHTML('beforeend', signatureHTML);
        }

    }
}

function generateDynamicLabResults(rowData) {
    let html = '';
    LAB_REFERENCES.forEach(lab => {
        for (let key of lab.keys) {
            if (rowData[key] && rowData[key].trim() !== '' && rowData[key].trim() !== '-') {
                const val = rowData[key];
                html += `
                <div class="flex flex-col p-3 sm:p-4 bg-white rounded-xl border border-blue-100 shadow-sm transition-shadow">
                    <div class="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
                        <p class="font-bold text-navy text-sm md:text-base">${lab.label}</p>
                        <span class="text-lg font-bold text-gray-800 bg-blue-50 px-3 py-1 rounded">${val}</span>
                    </div>
                    <p class="text-xs text-gray-500"><i class="fa-solid fa-bullseye text-blue-400 mr-1"></i> à¸„à¹ˆà¸²à¸›à¸à¸•à¸´ (Reference Range): <span class="font-semibold text-gray-700">${lab.normal}</span></p>
                </div>`;
                break;
            }
        }
    });

    if (html === '') {
        const allText = JSON.stringify(rowData).toLowerCase();
        let referenceTips = '';
        LAB_REFERENCES.forEach(lab => {
            if (lab.keys.some(k => allText.includes(k.toLowerCase()))) {
                referenceTips += `
                <li class="flex justify-between py-1 border-b border-gray-100 last:border-0">
                    <span class="text-gray-700 font-medium">${lab.label}</span>
                    <span class="text-blue-600 text-xs sm:text-sm bg-blue-50 px-2 rounded">${lab.normal}</span>
                </li>`;
            }
        });
        
        if (referenceTips) {
            html += `
            <div class="p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
                <p class="text-sm text-gray-600 mb-3"><i class="fa-solid fa-circle-info text-blue-500 mr-1"></i> <strong>à¹€à¸à¸“à¸‘à¹Œà¸¡à¸²à¸•à¸£à¸à¸²à¸™à¸œà¸¥à¹€à¸¥à¸·à¸­à¸”:</strong> à¸„à¹ˆà¸²à¸­à¹‰à¸²à¸‡à¸­à¸´à¸‡à¸ªà¸³à¸«à¸£à¸±à¸šà¸œà¸¥à¸à¸²à¸£à¸•à¸£à¸§à¸ˆà¸—à¸µà¹ˆà¸£à¸°à¸šà¸¸à¹ƒà¸™à¸£à¸²à¸¢à¸‡à¸²à¸™à¸‚à¸­à¸‡à¸„à¸¸à¸“</p>
                <ul class="text-sm">
                    ${referenceTips}
                </ul>
            </div>`;
        }
    }
    return html;
}

function isNumericalAbnormal(valString, normalString, gender) {
    if (!valString || !normalString) return false;
    
    // Extract numbers from value
    const valMatch = valString.match(/-?\d+(\.\d+)?/);
    if (!valMatch) return false;
    const valNum = parseFloat(valMatch[0]);
    if (isNaN(valNum)) return false;

    // Handle gender specific normal ranges
    let targetNormal = normalString;
    if (normalString.includes('(à¸Šà¸²à¸¢)') && normalString.includes('(à¸«à¸à¸´à¸‡)')) {
        const parts = normalString.split(',');
        if (gender === 'à¸Šà¸²à¸¢') {
            targetNormal = parts.find(p => p.includes('(à¸Šà¸²à¸¢)')) || targetNormal;
        } else if (gender === 'à¸«à¸à¸´à¸‡') {
            targetNormal = parts.find(p => p.includes('(à¸«à¸à¸´à¸‡)')) || targetNormal;
        }
    }

    // Pattern: "X - Y"
    const rangeMatch = targetNormal.match(/(-?\d+(\.\d+)?)\s*-\s*(-?\d+(\.\d+)?)/);
    if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[3]);
        if (valNum < min || valNum > max) return true;
        return false;
    }

    // Pattern: "< X"
    const lessMatch = targetNormal.match(/<\s*(-?\d+(\.\d+)?)/);
    if (lessMatch) {
        const max = parseFloat(lessMatch[1]);
        if (valNum >= max) return true;
        return false;
    }

    // Pattern: "> X"
    const greaterMatch = targetNormal.match(/>\s*(-?\d+(\.\d+)?)/);
    if (greaterMatch) {
        const min = parseFloat(greaterMatch[1]);
        if (valNum <= min) return true;
        return false;
    }

    return false;
}

function renderTestRow(field, rowData) {
    let value = typeof field.valueKey === 'function' ? field.valueKey(rowData) : rowData[field.valueKey];
    if (!value || typeof value !== 'string' || value.trim() === '' || value.trim() === '-' || value.trim() === 'à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸•à¸£à¸§à¸ˆ' || value.includes('undefined')) {
        return `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white rounded-xl border border-gray-100 shadow-sm transition-shadow opacity-60">
                <div class="mb-2 sm:mb-0 flex-1">
                    <p class="font-semibold text-gray-800 text-sm md:text-base">${field.label}</p>
                </div>
                <div class="flex items-center sm:justify-end shrink-0 mt-2 sm:mt-0 text-gray-400 text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                    <i class="fa-solid fa-minus mr-1.5"></i> à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸•à¸£à¸§à¸ˆ
                </div>
            </div>`;
    }
    
    let desc = field.descKey ? rowData[field.descKey] : '';
    if(!desc || desc === '-') desc = '';
    
    let isAbnormal = false;
    const checkText = (value + " " + desc).toLowerCase();
    const checkTextNoHeight = checkText.replace(/à¸ªà¹ˆà¸§à¸™à¸ªà¸¹à¸‡/g, '');
    
    if (checkTextNoHeight.includes('à¸œà¸´à¸”à¸›à¸à¸•à¸´') || checkTextNoHeight.includes('à¸­à¹‰à¸§à¸™') || checkTextNoHeight.includes('à¸ªà¸¹à¸‡') || checkTextNoHeight.includes('à¹€à¸ªà¸µà¹ˆà¸¢à¸‡') || checkTextNoHeight.includes('à¸žà¸šà¹à¸žà¸—à¸¢à¹Œ') || checkTextNoHeight.includes('à¸•à¹ˆà¸³à¸à¸§à¹ˆà¸²')) {
        isAbnormal = true;
        if (checkTextNoHeight.includes('à¹„à¸¡à¹ˆà¹€à¸‚à¹‰à¸²à¹€à¸à¸“à¸‘à¹Œà¹‚à¸£à¸„à¸„à¸§à¸²à¸¡à¸”à¸±à¸™à¹‚à¸¥à¸«à¸´à¸•à¸ªà¸¹à¸‡') && !checkTextNoHeight.includes('à¸œà¸´à¸”à¸›à¸à¸•à¸´') && !checkTextNoHeight.includes('à¹„à¸‚à¸¡à¸±à¸™')) isAbnormal = false;
        if (checkTextNoHeight.includes('à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¸§à¸²à¸¡à¹€à¸ªà¸µà¹ˆà¸¢à¸‡') || checkTextNoHeight.includes('à¹„à¸¡à¹ˆà¸žà¸šà¸„à¸§à¸²à¸¡à¸œà¸´à¸”à¸›à¸à¸•à¸´')) {
            // Handled
        }
    }
    
    if (value.includes('à¹„à¸¡à¹ˆà¹€à¸‚à¹‰à¸²à¹€à¸à¸“à¸‘à¹Œà¹‚à¸£à¸„à¹€à¸šà¸²à¸«à¸§à¸²à¸™')) isAbnormal = false;
    if (value.includes('à¸›à¸à¸•à¸´') && !value.includes('à¸œà¸´à¸”à¸›à¸à¸•à¸´') && !desc.includes('à¸œà¸´à¸”à¸›à¸à¸•à¸´') && !desc.includes('à¸ªà¸¹à¸‡') && !desc.includes('à¹€à¸ªà¸µà¹ˆà¸¢à¸‡') && !desc.includes('à¸žà¸šà¹à¸žà¸—à¸¢à¹Œ') && !desc.includes('à¸•à¹ˆà¸³à¸à¸§à¹ˆà¸²')) isAbnormal = false;

    // Smart numerical check
    if (!isAbnormal && field.normal) {
        const gender = AppState.currentPatient ? AppState.currentPatient.gender : '';
        if (isNumericalAbnormal(value, field.normal, gender)) {
            isAbnormal = true;
        }
    }

    const statusColor = isAbnormal ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200';
    const icon = isAbnormal ? 'fa-circle-xmark' : 'fa-circle-check';
    const statusText = isAbnormal ? 'à¸„à¸§à¸£à¹€à¸à¹‰à¸²à¸£à¸°à¸§à¸±à¸‡' : 'à¸­à¸¢à¸¹à¹ˆà¹ƒà¸™à¹€à¸à¸“à¸‘à¹Œà¸›à¸à¸•à¸´';
    
    if(field.key === 'Doctor' || field.key === 'FU') {
        const displayValue = field.key === 'Doctor' ? formatDoctorOpinion(value) : value;
        const hiddenFlag = isAbnormal ? '<i class="fa-solid fa-circle-xmark hidden"></i>' : '';
        return `
        <div class="p-3 sm:p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow transition-shadow ${isAbnormal ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}">
            <p class="font-semibold text-gray-800 text-sm md:text-base mb-2">${field.label}</p>
            <div class="text-sm font-medium ${field.key==='Doctor'?'text-navy':'text-gray-700'}">${displayValue}</div>
            ${desc && desc.trim() !== '' ? `<p class="text-xs text-blue-600 mt-3 pt-2 border-t border-gray-100"><i class="fa-solid fa-calendar-check mr-1"></i> à¸™à¸±à¸”à¸žà¸šà¹à¸žà¸—à¸¢à¹Œ: ${desc}</p>` : ''}
            ${hiddenFlag}
        </div>
        `;
    }

    const refHtml = field.refHtml ? field.refHtml : '';
    const normalRangeHtml = field.normal ? `<span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded border border-blue-200 mt-2 mr-2"><i class="fa-solid fa-flask mr-1"></i> à¸„à¹ˆà¸²à¸›à¸à¸•à¸´: <strong>${field.normal}</strong></span>` : '';

    return `
        <div class="flex flex-col sm:flex-row sm:items-start justify-between p-3 sm:p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow transition-shadow">
            <div class="mb-2 sm:mb-0 flex-1 pr-4 w-full">
                <p class="font-semibold text-gray-800 text-sm md:text-base">${field.label}</p>
                <p class="text-sm font-medium ${isAbnormal ? 'text-red-600' : 'text-navy'} mt-1">${value}</p>
                ${desc && desc.trim() !== '' ? `<div class="text-sm text-gray-600 mt-2 bg-gray-50 p-2.5 rounded border border-gray-100 leading-relaxed"><i class="fa-solid fa-notes-medical mr-1 text-blue-500"></i> ${formatDoctorOpinion(desc)}</div>` : ''}
                ${normalRangeHtml}
                ${refHtml}
            </div>
            <div class="flex items-center sm:justify-end shrink-0 mt-2 sm:mt-0">
                <div class="px-3 py-1.5 rounded-lg border ${statusColor} flex items-center justify-center shadow-inner">
                    <i class="fa-solid ${icon} mr-1.5"></i>
                    <span class="font-bold text-xs sm:text-sm whitespace-nowrap">${statusText}</span>
                </div>
            </div>
        </div>
    `;
}

window.toggleAccordion = function(id) {
    const content = document.getElementById(`content-${id}`);
    const icon = document.getElementById(`icon-${id}`);
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        icon.classList.remove('open');
    } else {
        content.classList.add('open');
        icon.classList.add('open');
    }
}

// --- Staff Dashboard Logic ---
function renderStaffDashboard() {
    if(!DOM.tableBody) return;
    const total = AppState.patients.length;
    let ncdCount = 0;
    let lipidCount = 0;
    let normalCount = 0;
    
    let ageGroups = { '<30': 0, '30-40': 0, '41-50': 0, '>50': 0 };
    let abnormalTests = { 'à¹€à¸ªà¸µà¹ˆà¸¢à¸‡à¹€à¸šà¸²à¸«à¸§à¸²à¸™ (DM)': 0, 'à¹€à¸ªà¸µà¹ˆà¸¢à¸‡à¸„à¸§à¸²à¸¡à¸”à¸±à¸™ (HT)': 0, 'à¹„à¸‚à¸¡à¸±à¸™à¸œà¸´à¸”à¸›à¸à¸•à¸´ (DLP)': 0, 'à¸¡à¸µà¸ à¸²à¸§à¸°à¸­à¹‰à¸§à¸™ (BMI)': 0 };
    
    AppState.patients.forEach(p => {
        if (!p.isHealthy) ncdCount++;
        else normalCount++;
        
        const r = p.rowData;
        
        if (r['à¸„à¸±à¸”à¸à¸£à¸­à¸‡ NCD (DM)'] && r['à¸„à¸±à¸”à¸à¸£à¸­à¸‡ NCD (DM)'].includes('à¸œà¸´à¸”à¸›à¸à¸•à¸´')) abnormalTests['à¹€à¸ªà¸µà¹ˆà¸¢à¸‡à¹€à¸šà¸²à¸«à¸§à¸²à¸™ (DM)']++;
        if (r['à¸„à¸±à¸”à¸à¸£à¸­à¸‡ NCD (HT)'] && r['à¸„à¸±à¸”à¸à¸£à¸­à¸‡ NCD (HT)'].includes('à¸œà¸´à¸”à¸›à¸à¸•à¸´')) abnormalTests['à¹€à¸ªà¸µà¹ˆà¸¢à¸‡à¸„à¸§à¸²à¸¡à¸”à¸±à¸™ (HT)']++;
        if (r['à¸„à¸±à¸”à¸à¸£à¸­à¸‡ NCD (DLP)'] && r['à¸„à¸±à¸”à¸à¸£à¸­à¸‡ NCD (DLP)'].includes('à¸œà¸´à¸”à¸›à¸à¸•à¸´')) {
            abnormalTests['à¹„à¸‚à¸¡à¸±à¸™à¸œà¸´à¸”à¸›à¸à¸•à¸´ (DLP)']++;
            lipidCount++;
        }
        if (r['à¹à¸›à¸¥à¸œà¸¥ BMI'] && r['à¹à¸›à¸¥à¸œà¸¥ BMI'].includes('à¸­à¹‰à¸§à¸™')) abnormalTests['à¸¡à¸µà¸ à¸²à¸§à¸°à¸­à¹‰à¸§à¸™ (BMI)']++;
        
        const age = parseInt(p.age);
        if (!isNaN(age)) {
            if (age < 30) ageGroups['<30']++;
            else if (age <= 40) ageGroups['30-40']++;
            else if (age <= 50) ageGroups['41-50']++;
            else ageGroups['>50']++;
        }
    });
    
    if(DOM.kpiTotal) DOM.kpiTotal.textContent = total;
    if(DOM.kpiNcd) DOM.kpiNcd.textContent = `${Math.round((ncdCount / total) * 100) || 0}%`;
    if(DOM.kpiLipid) DOM.kpiLipid.textContent = `${Math.round((lipidCount / total) * 100) || 0}%`;
    if(DOM.kpiNormal) DOM.kpiNormal.textContent = `${Math.round((normalCount / total) * 100) || 0}%`;
    
    renderCharts(ageGroups, abnormalTests);
    
    const thead = document.querySelector('thead tr');
    if(thead) {
        thead.innerHTML = `
            <th class="px-4 py-3 text-left font-semibold tracking-wider">à¹€à¸¥à¸‚à¸šà¸±à¸•à¸£à¸›à¸£à¸°à¸Šà¸²à¸Šà¸™</th>
            <th class="px-4 py-3 text-left font-semibold tracking-wider">à¸Šà¸·à¹ˆà¸­-à¸™à¸²à¸¡à¸ªà¸à¸¸à¸¥</th>
            <th class="px-4 py-3 text-left font-semibold tracking-wider">à¸­à¸²à¸¢à¸¸</th>
            <th class="px-4 py-3 text-left font-semibold tracking-wider">à¹€à¸žà¸¨</th>
            <th class="px-4 py-3 text-left font-semibold tracking-wider">à¸ªà¸–à¸²à¸™à¸°à¸ à¸²à¸žà¸£à¸§à¸¡</th>
            <th class="px-4 py-3 text-left font-semibold tracking-wider">BMI</th>
            <th class="px-4 py-3 text-left font-semibold tracking-wider">BP</th>
            <th class="px-4 py-3 text-left font-semibold tracking-wider">à¸„à¸§à¸²à¸¡à¹€à¸«à¹‡à¸™à¹à¸žà¸—à¸¢à¹Œ (à¸¢à¹ˆà¸­)</th>
        `;
    }
    
    renderStaffTable();
}

function renderCharts(ageData, abnormalData) {
    if(!document.getElementById('ageChart')) return;
    
    if (AppState.charts.ageChart) AppState.charts.ageChart.destroy();
    if (AppState.charts.abnormalChart) AppState.charts.abnormalChart.destroy();
    
    const ctxAge = document.getElementById('ageChart').getContext('2d');
    AppState.charts.ageChart = new Chart(ctxAge, {
        type: 'bar',
        data: {
            labels: Object.keys(ageData),
            datasets: [{
                label: 'à¸ˆà¸³à¸™à¸§à¸™ (à¸„à¸™)',
                data: Object.values(ageData),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderColor: 'rgb(37, 99, 235)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } }
        }
    });
    
    const ctxAbnormal = document.getElementById('abnormalChart').getContext('2d');
    AppState.charts.abnormalChart = new Chart(ctxAbnormal, {
        type: 'doughnut',
        data: {
            labels: Object.keys(abnormalData),
            datasets: [{
                data: Object.values(abnormalData),
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(249, 115, 22, 0.8)',
                    'rgba(234, 179, 8, 0.8)',
                    'rgba(168, 85, 247, 0.8)'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: { legend: { position: 'right' } }
        }
    });
}

function renderStaffTable() {
    if(!DOM.tableBody) return;
    const { currentPage, itemsPerPage, filteredPatients } = AppState.pagination;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = filteredPatients.slice(start, end);
    
    if(DOM.tableCount) DOM.tableCount.textContent = `${start + 1}-${Math.min(end, filteredPatients.length)} à¸ˆà¸²à¸ ${filteredPatients.length}`;
    DOM.tableBody.innerHTML = '';
    
    paginated.forEach(p => {
        const r = p.rowData;
        const statusBadge = p.isHealthy 
            ? `<span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">à¸›à¸à¸•à¸´</span>`
            : `<span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">à¸žà¸šà¸„à¸§à¸²à¸¡à¹€à¸ªà¸µà¹ˆà¸¢à¸‡</span>`;
            
        let docOpinion = r['à¸„à¸§à¸²à¸¡à¹€à¸«à¹‡à¸™à¹à¸žà¸—à¸¢à¹Œ'] || '-';
        if (docOpinion.length > 30) docOpinion = docOpinion.substring(0, 30) + '...';
            
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors cursor-pointer';
        tr.onclick = () => {
            viewPatient(p);
        };
        tr.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-gray-900 font-mono text-sm">${p.id}</td>
            <td class="px-4 py-3 whitespace-nowrap text-navy font-medium">${p.name}</td>
            <td class="px-4 py-3 whitespace-nowrap text-gray-600">${p.age}</td>
            <td class="px-4 py-3 whitespace-nowrap text-gray-600">${p.gender}</td>
            <td class="px-4 py-3 whitespace-nowrap">${statusBadge}</td>
            <td class="px-4 py-3 whitespace-nowrap text-gray-600">${r['BMI'] || '-'}</td>
            <td class="px-4 py-3 whitespace-nowrap text-gray-600">${r['BP'] || '-'}</td>
            <td class="px-4 py-3 text-gray-600 text-xs">${docOpinion}</td>
        `;
        DOM.tableBody.appendChild(tr);
    });
    
    if(DOM.btnPrevPage) DOM.btnPrevPage.disabled = currentPage === 1;
    if(DOM.btnNextPage) DOM.btnNextPage.disabled = end >= filteredPatients.length;
}

document.addEventListener('DOMContentLoaded', init);

async function fetchStaffUploadedFiles(citizenId) {
    if (!DOM.uploadedFilesList) return;
    DOM.uploadedFilesList.innerHTML = '<div class="flex items-center text-gray-400 italic"><i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลด...</div>';
    
    if (!supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('patient_files')
            .select('*')
            .eq('citizen_id', citizenId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            DOM.uploadedFilesList.innerHTML = '<div class="text-gray-400 italic text-sm py-2">ยังไม่มีไฟล์แนบ</div>';
            return;
        }
        
        DOM.uploadedFilesList.innerHTML = data.map(file => `
            <div class="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm mb-2">
                <div class="flex items-center">
                    <i class="fa-solid fa-file-pdf text-red-500 text-lg mr-3"></i>
                    <div>
                        <p class="font-medium text-navy text-sm">${file.document_type}</p>
                        <p class="text-xs text-gray-400">${new Date(file.created_at).toLocaleString('th-TH')}</p>
                    </div>
                </div>
                <a href="${file.file_url}" target="_blank" class="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium">
                    <i class="fa-solid fa-eye mr-1"></i> ดูไฟล์
                </a>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Fetch files error:', error);
        DOM.uploadedFilesList.innerHTML = '<div class="text-red-500 text-sm">ไม่สามารถดึงข้อมูลไฟล์ได้</div>';
    }
}

async function fetchPatientDocuments(citizenId) {
    if (!DOM.patientDocumentsSection || !DOM.patientDocumentsContainer) return;
    
    // Hide initially
    DOM.patientDocumentsSection.classList.add('hidden');
    DOM.patientDocumentsContainer.innerHTML = '<div class="text-sm text-gray-400 italic col-span-full"><i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังตรวจสอบเอกสาร...</div>';
    
    if (!supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('patient_files')
            .select('*')
            .eq('citizen_id', citizenId)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        if (data && data.length > 0) {
            DOM.patientDocumentsSection.classList.remove('hidden');
            
            // Map icons based on document type
            const getIcon = (type) => {
                if(type.includes('X-ray') || type.includes('Bone') || type.includes('Ultrasound')) return 'fa-x-ray text-indigo-500';
                if(type.includes('Body')) return 'fa-person-walking text-orange-500';
                return 'fa-flask text-blue-500';
            };
            
            DOM.patientDocumentsContainer.innerHTML = data.map(file => `
                <a href="${file.file_url}" target="_blank" class="flex items-center p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition-all group shadow-sm">
                    <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 mr-3 group-hover:scale-110 transition-transform">
                        <i class="fa-solid ${getIcon(file.document_type)} text-lg"></i>
                    </div>
                    <div class="flex-1 overflow-hidden">
                        <h4 class="font-bold text-gray-800 text-sm truncate group-hover:text-blue-700 transition-colors">${file.document_type}</h4>
                        <p class="text-xs text-gray-500 mt-0.5 truncate">${new Date(file.created_at).toLocaleDateString('th-TH')} - แตะเพื่อดูผล</p>
                    </div>
                    <i class="fa-solid fa-download text-gray-300 group-hover:text-blue-500 ml-2"></i>
                </a>
            `).join('');
        }
        
    } catch (error) {
        console.error('Fetch patient documents error:', error);
    }
}
