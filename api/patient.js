const { getPatientsData } = require('./_shared');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
        console.error('Patient API error:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลจากเซิร์ฟเวอร์' });
    }
};
