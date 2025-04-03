// API基础URL
const API_BASE_URL = 'http://localhost:8000/api/v1';

let currentPatientId = null;

// 获取患者列表
async function getPatients() {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/`);
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
    
    patients.forEach(patient => {
        const patientItem = document.createElement('div');
        patientItem.className = 'card mb-2';
        patientItem.innerHTML = `
            <div class="card-body">
                <h6 class="card-title">患者ID: ${patient.id}</h6>
                <p class="card-text">诊断: ${patient.diagnosis || '未填写'}</p>
                <button class="btn btn-sm btn-primary" onclick="loadPatient(${patient.id})">查看</button>
            </div>
        `;
        patientList.appendChild(patientItem);
    });
}

// 加载患者信息
async function loadPatient(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}`);
        const patient = await response.json();
        currentPatientId = patientId;
        fillPatientForm(patient);
        displayPrescriptionInfo(patient);
    } catch (error) {
        console.error('Error loading patient:', error);
    }
}

// 填充患者表单
function fillPatientForm(patient) {
    const form = document.getElementById('patientForm');
    for (const [key, value] of Object.entries(patient)) {
        const input = form.elements[key];
        if (input) {
            input.value = value || '';
        }
    }
}

// 显示处方信息
function displayPrescriptionInfo(patient) {
    const prescriptionCard = document.getElementById('prescriptionCard');
    if (patient.generated_prescription) {
        prescriptionCard.style.display = 'block';
        document.getElementById('westernTreatmentStage').textContent = patient.western_treatment_stage || '';
        document.getElementById('cscoGuideline').innerHTML = patient.csco_guideline || '';
        document.getElementById('prescription').textContent = patient.prescription || '';
        document.getElementById('medicine').textContent = patient.chinese_medicine || '';
        document.getElementById('repairRules').value = patient.repair_rules || '';
    } else {
        prescriptionCard.style.display = 'none';
    }
}

// 创建新患者
async function createNewPatient() {
    const form = document.getElementById('patientForm');
    form.reset();
    currentPatientId = null;
    document.getElementById('prescriptionCard').style.display = 'none';
}

// 生成处方
async function generatePrescription() {
    if (!currentPatientId) {
        alert('请先保存患者信息！');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/patients/${currentPatientId}/generate-prescription`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();
            document.getElementById('westernTreatmentStage').textContent = result.western_treatment_stage;
            document.getElementById('cscoGuideline').innerHTML = result.csco_guideline;
            document.getElementById('prescription').textContent = result.prescription;
            document.getElementById('medicine').textContent = result.medicine;
            document.getElementById('prescriptionCard').style.display = 'block';
            alert('处方生成成功！');
        } else {
            alert('处方生成失败，请重试！');
        }
    } catch (error) {
        console.error('Error generating prescription:', error);
        alert('处方生成失败，请重试！');
    }
}

// 修复处方
async function repairPrescription() {
    if (!currentPatientId) {
        alert('请先选择患者！');
        return;
    }

    const rules = document.getElementById('repairRules').value;

    try {
        const response = await fetch(`${API_BASE_URL}/patients/${currentPatientId}/repair-prescription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rules })
        });

        if (response.ok) {
            const result = await response.json();
            document.getElementById('prescription').textContent = result.prescription;
            document.getElementById('medicine').textContent = result.medicine;
            alert('处方修复成功！');
        } else {
            alert('处方修复失败，请重试！');
        }
    } catch (error) {
        console.error('Error repairing prescription:', error);
        alert('处方修复失败，请重试！');
    }
}

// 采纳修复
async function adoptRepair() {
    if (!currentPatientId) {
        alert('请先选择患者！');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/patients/${currentPatientId}/adopt-repair`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();
            document.getElementById('prescription').textContent = result.prescription;
            document.getElementById('medicine').textContent = result.medicine;
            alert('修复已采纳！');
        } else {
            alert('采纳修复失败，请重试！');
        }
    } catch (error) {
        console.error('Error adopting repair:', error);
        alert('采纳修复失败，请重试！');
    }
}

// 提交患者信息
document.getElementById('patientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const patientData = {};
    formData.forEach((value, key) => {
        patientData[key] = value;
    });

    try {
        const response = await fetch(`${API_BASE_URL}/patients/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(patientData),
        });

        if (response.ok) {
            const result = await response.json();
            currentPatientId = result.id;
            alert('患者信息保存成功！');
            getPatients();
        } else {
            alert('保存失败，请重试！');
        }
    } catch (error) {
        console.error('Error saving patient:', error);
        alert('保存失败，请重试！');
    }
});

// 页面加载时获取患者列表
document.addEventListener('DOMContentLoaded', getPatients); 