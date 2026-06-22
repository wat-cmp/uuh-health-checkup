require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const Papa = require('papaparse');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQKH6BmbFctC-wCBfo0vMYCDfGkwvO9rCSX1vv9AtJgJNysoGptpaKm4rEZrnbRK6CFOuXKGFzOQ4u_/pub?gid=0&single=true&output=csv';

// Helper to fetch and parse data
async function getPatientsData() {
    try {
        const response = await axios.get(CSV_URL);
        const csvData = response.data;
        
        return new Promise((resolve, reject) => {
            Papa.parse(csvData, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    const data = results.data;
                    const patients = data.filter(row => row['เลขบัตรประชาชน']).map(row => {
                        const idStr = row['เลขบัตรประชาชน'].toString().trim();
                        let formattedId = idStr;
                        if (idStr.length === 13) {
                            formattedId = `${idStr.charAt(0)}-${idStr.substring(1,5)}-${idStr.substring(5,10)}-${idStr.substring(10,12)}-${idStr.charAt(12)}`;
                        }

                        // Auto-calculate BMI if not provided
                        const weight = parseFloat(row['น้ำหนัก']);
                        const heightCm = parseFloat(row['ส่วนสูง']);
                        if (!isNaN(weight) && !isNaN(heightCm) && heightCm > 0) {
                            const heightM = heightCm / 100;
                            const calcBMI = (weight / (heightM * heightM)).toFixed(1);
                            
                            if (!row['BMI'] || row['BMI'].toString().trim() === '' || row['BMI'].toString().trim() === '-') {
                                row['BMI'] = calcBMI;
                                
                                const bmiVal = parseFloat(calcBMI);
                                if (bmiVal < 18.5) row['แปลผล BMI'] = "น้ำหนักน้อย / ผอม";
                                else if (bmiVal < 23) row['แปลผล BMI'] = "ปกติ / สุขภาพดี";
                                else if (bmiVal < 25) row['แปลผล BMI'] = "ท้วม / อ้วนระดับ 1";
                                else if (bmiVal < 30) row['แปลผล BMI'] = "อ้วน / อ้วนระดับ 2";
                                else row['แปลผล BMI'] = "อ้วนมาก / อ้วนระดับ 3";
                            }
                        }

                        let isHealthy = true;
                        const docOp = row['ความเห็นแพทย์'] || '';
                        const bmiTrans = row['แปลผล BMI'] || '';
                        const abnorm = row['ตัวผิดปกติ+แนะนำ'] || '';
                        const spec = row['ระบุ(กรณีผลผิดปกติ)'] || '';
                        const cxr = row['ผล CXR'] || '';
                        const ekg = row['ผล EKG'] || '';
                        const dm = row['คัดกรอง NCD (DM)'] || '';
                        const ht = row['คัดกรอง NCD (HT)'] || '';

                        const checkStr = (docOp + " " + bmiTrans + " " + abnorm + " " + spec + " " + cxr + " " + ekg).toLowerCase();
                        if (checkStr.includes('ผิดปกติ') || checkStr.includes('แนะนำพบแพทย์') || checkStr.includes('อ้วน') || checkStr.includes('เสี่ยง')) {
                            isHealthy = false;
                        }
                        if (dm.includes('ผิดปกติ')) isHealthy = false;
                        if (ht.includes('ผิดปกติ')) isHealthy = false;
                        
                        return {
                            id: formattedId,
                            rawId: idStr,
                            hn: row['HN'] ? row['HN'].toString().trim() : '',
                            name: `${row['คำนำหน้า'] || ''} ${row['ชื่อ'] || ''} ${row['สกุล'] || ''}`.trim(),
                            age: row['อายุ'] || '-',
                            gender: (row['คำนำหน้า'] === 'นาย' || row['คำนำหน้า'] === 'ด.ช.') ? 'ชาย' : 'หญิง',
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
    } catch (error) {
        console.error("Error fetching CSV:", error);
        throw error;
    }
}

// API for Patient Login (Secure)
app.post('/api/patient', async (req, res) => {
    const { citizenId, hn } = req.body;
    
    if (!citizenId || !hn) {
        return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน (เลขบัตรประชาชน และ HN)' });
    }

    try {
        const patients = await getPatientsData();
        const patient = patients.find(p => p.rawId === citizenId && p.hn === hn);
        
        if (patient) {
            res.json(patient);
        } else {
            res.status(404).json({ error: 'ไม่พบข้อมูลในระบบ กรุณาตรวจสอบเลขประจำตัวประชาชน และ HN อีกครั้ง' });
        }
    } catch (error) {
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลจากเซิร์ฟเวอร์' });
    }
});

// API for Staff Dashboard (Protected)
app.post('/api/staff', async (req, res) => {
    const { password } = req.body;
    
    if (password !== process.env.STAFF_PASSWORD) {
        return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }

    try {
        const patients = await getPatientsData();
        res.json(patients);
    } catch (error) {
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลจากเซิร์ฟเวอร์' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/staff.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'staff.html'));
});

// Export for Vercel Serverless Functions
module.exports = app;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
}
