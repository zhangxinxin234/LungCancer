const API_BASE_URL = 'http://localhost:8000/api/v1';
let currentPatientId = null;

// 从URL获取参数
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// 页面加载时的初始化
document.addEventListener('DOMContentLoaded', async () => {
    const patientId = getUrlParam('patient_id');
    if (patientId) {
        currentPatientId = patientId;
        updateNavigationLinks(patientId);
        await loadExistingPrescription(patientId);
        
        // 只有当从患者信息页面点击"生成处方"时才生成新处方
        const shouldGenerate = getUrlParam('generate');
        if (shouldGenerate === 'true') {
            await generatePrescription(patientId);
        }
    }
});

// 更新导航链接
function updateNavigationLinks(patientId) {
    const prescriptionLink = document.getElementById('prescriptionLink');
    const repairLink = document.getElementById('repairLink');
    const patientInfoLink = document.getElementById('patientInfoLink');
    
    if (patientId) {
        prescriptionLink.href = `/prescription?patient_id=${patientId}`;
        repairLink.href = `/repair?patient_id=${patientId}`;
        patientInfoLink.href = `/patient_info?patient_id=${patientId}`;
    }
}

// 加载现有处方
async function loadExistingPrescription(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}`);
        const patient = await response.json();
        
        if (patient.prescription) {
            displayPrescription({
                prescription: patient.prescription,
                medicine: patient.chinese_medicine,
                western_treatment_stage: patient.western_treatment_stage,
                csco_guideline: patient.csco_guideline
            });
        }
    } catch (error) {
        console.error('Error loading existing prescription:', error);
        alert('加载现有处方失败');
    }
}

// 获取患者列表
async function getPatients() {
    try {
        const response = await fetch(`${API_BASE_URL}/patients`);
        const patients = await response.json();
        displayPatients(patients);
    } catch (error) {
        console.error('Error fetching patients:', error);
    }
}

// 显示患者列表
function displayPatients(patients) {
    const patientList = document.getElementById('patientList');
    patientList.innerHTML = '';
    
    // 按ID倒序排序（假设ID越大表示创建时间越新）
    patients.sort((a, b) => b.id - a.id);
    
    patients.forEach(patient => {
        const patientItem = document.createElement('div');
        patientItem.className = 'card mb-2';
        patientItem.innerHTML = `
            <div class="card-body">
                <h6 class="card-title">患者ID: ${patient.id}</h6>
                <p class="card-text">${patient.diagnosis || '暂无诊断'}</p>
                <div class="btn-group">
                    <button class="btn btn-sm btn-primary" onclick="generatePrescription(${patient.id})">生成处方</button>
                    <button class="btn btn-sm btn-danger ms-2" onclick="deletePatient(${patient.id})">删除</button>
                </div>
            </div>
        `;
        patientList.appendChild(patientItem);
    });
}

// 删除患者
async function deletePatient(patientId) {
    if (!confirm('确定要删除这个患者吗？此操作不可恢复。')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('患者删除成功');
            getPatients(); // 刷新患者列表
        } else {
            alert('删除失败');
        }
    } catch (error) {
        console.error('Error deleting patient:', error);
        alert('删除失败');
    }
}

// 生成处方
async function generatePrescription(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/generate-prescription`, {
            method: 'POST'
        });
        const prescription = await response.json();
        displayPrescription(prescription);
    } catch (error) {
        console.error('Error generating prescription:', error);
        alert('生成处方失败');
    }
}

// 显示处方
function displayPrescription(prescription) {
    document.getElementById('prescription').textContent = prescription.prescription || '';
    document.getElementById('medicine').textContent = prescription.medicine || '';
    document.getElementById('westernTreatmentStage').textContent = prescription.western_treatment_stage || '';
    document.getElementById('cscoGuideline').textContent = prescription.csco_guideline || '';
}

// 保存处方
async function savePrescription() {
    const prescription = {
        western_treatment_stage: document.getElementById('westernTreatmentStage').textContent,
        csco_guideline: document.getElementById('cscoGuideline').textContent,
        prescription: document.getElementById('prescription').textContent,
        medicine: document.getElementById('medicine').textContent
    };

    try {
        const response = await fetch(`${API_BASE_URL}/prescriptions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(prescription)
        });
        const result = await response.json();
        alert('处方保存成功！');
    } catch (error) {
        console.error('Error saving prescription:', error);
        alert('处方保存失败！');
    }
}

// 页面加载时获取患者列表
document.addEventListener('DOMContentLoaded', getPatients); 