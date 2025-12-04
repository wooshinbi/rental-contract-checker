const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.static(__dirname));
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('지원하지 않는 파일 형식입니다.'));
        }
    }
});

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString('base64'),
            mimeType
        }
    };
}

app.post('/api/analyze', upload.single('contract'), async (req, res) => {
    let filePath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: '파일이 업로드되지 않았습니다.' });
        }
        filePath = req.file.path;
        const mimeType = req.file.mimetype;
        const model = genAI.getGenerativeModel({model:'gemini-2.5-flash' });
        const prompt = `당신은 부동산 전문 변호사입니다. 임대차 계약서를 분석하고 JSON 형식으로 응답해주세요:
{
    "summary": "계약서 요약",
    "safetyLevel": "안전함|주의|위험",
    "riskFactors": ["위험요소1", "위험요소2"],
    "recommendations": ["개선사항1", "개선사항2"]
}`;
        const imagePart = fileToGenerativePart(filePath, mimeType);
        const result = await model.generateContent([prompt, imagePart]);
        const text = (await result.response).text();
        let analysisResult;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {
                summary: text.substring(0, 300),
                safetyLevel: '주의',
                riskFactors: ['AI가 분석하지 못했습니다.'],
                recommendations: ['전문가 자문을 구하세요.']
            };
        } catch (e) {
            analysisResult = {
                summary: text.substring(0, 300),
                safetyLevel: '주의',
                riskFactors: ['분석 중 오류가 발생했습니다.'],
                recommendations: ['다시 시도하거나 전문가에게 문의하세요.']
            };
        }
        fs.unlinkSync(filePath);
        res.json({ success: true, analysis: analysisResult });
    } catch (error) {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ success: false, error: '분석 중 오류가 발생했습니다.' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', geminiConfigured: !!process.env.GEMINI_API_KEY });
});

app.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 서버가 시작되었습니다!');
    console.log(`📡 포트: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? '✅ 설정됨' : '❌ 미설정'}`);
    console.log('========================================');
});
