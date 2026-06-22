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

    const { password } = req.body;

    if (password !== process.env.STAFF_PASSWORD) {
        return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }

    try {
        const patients = await getPatientsData();
        res.json(patients);
    } catch (error) {
        console.error('Staff API error:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลจากเซิร์ฟเวอร์' });
    }
};
