const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const fileLabel = document.querySelector('.file-label');
const fileName = document.getElementById('fileName');
const analyzeBtn = document.getElementById('analyzeBtn');
const uploadSection = document.querySelector('.upload-section');
const loadingSection = document.getElementById('loadingSection');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const safetyBadge = document.getElementById('safetyBadge');
const safetyLevel = document.getElementById('safetyLevel');
const summaryText = document.getElementById('summaryText');
const riskList = document.getElementById('riskList');
const recommendationList = document.getElementById('recommendationList');
const errorMessage = document.getElementById('errorMessage');
const resetBtn = document.getElementById('resetBtn');
const retryBtn = document.getElementById('retryBtn');

fileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        fileName.textContent = file.name;
        fileLabel.classList.add('has-file');
        if (file.size > 10 * 1024 * 1024) {
            alert('파일 크기는 10MB를 초과할 수 없습니다.');
            this.value = '';
            fileName.textContent = '파일 선택';
            fileLabel.classList.remove('has-file');
        }
    }
});

uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!fileInput.files || !fileInput.files[0]) {
        alert('파일을 선택해주세요.');
        return;
    }
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 분석 중...';
    showSection('loading');
    const formData = new FormData();
    formData.append('contract', fileInput.files[0]);
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '서버 오류가 발생했습니다.');
        if (data.success) {
            displayResults(data.analysis);
        } else {
            throw new Error(data.error || '분석에 실패했습니다.');
        }
    } catch (error) {
        showError(error.message);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> 계약서 분석하기';
    }
});

function displayResults(analysis) {
    safetyLevel.textContent = analysis.safetyLevel;
    safetyBadge.classList.remove('safe', 'warning', 'danger');
    if (analysis.safetyLevel === '안전함') {
        safetyBadge.classList.add('safe');
    } else if (analysis.safetyLevel === '주의') {
        safetyBadge.classList.add('warning');
    } else {
        safetyBadge.classList.add('danger');
    }
    summaryText.textContent = analysis.summary;
    riskList.innerHTML = '';
    if (analysis.riskFactors && analysis.riskFactors.length > 0) {
        analysis.riskFactors.forEach(risk => {
            const li = document.createElement('li');
            li.textContent = risk;
            riskList.appendChild(li);
        });
    }
    recommendationList.innerHTML = '';
    if (analysis.recommendations && analysis.recommendations.length > 0) {
        analysis.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            recommendationList.appendChild(li);
        });
    }
    showSection('result');
}

function showError(message) {
    errorMessage.textContent = message;
    showSection('error');
}

function showSection(section) {
    uploadSection.style.display = 'none';
    loadingSection.style.display = 'none';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    if (section === 'upload') {
        uploadSection.style.display = 'block';
    } else if (section === 'loading') {
        loadingSection.style.display = 'block';
    } else if (section === 'result') {
        resultSection.style.display = 'block';
    } else if (section === 'error') {
        errorSection.style.display = 'block';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

resetBtn.addEventListener('click', function() {
    uploadForm.reset();
    fileName.textContent = '파일 선택';
    fileLabel.classList.remove('has-file');
    showSection('upload');
});

retryBtn.addEventListener('click', function() {
    showSection('upload');
});
