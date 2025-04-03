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
        await loadPatientInfo(patientId);
        updateNavigationLinks(patientId);
    }
    
    // 设置表单提交事件
    document.getElementById('patientForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await savePatient();
    });

    // 获取患者列表
    await getPatients();
});

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
                    <button class="btn btn-sm btn-primary" onclick="loadPatientInfo(${patient.id})">查看</button>
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

// 加载患者信息
async function loadPatientInfo(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}`);
        const patient = await response.json();
        currentPatientId = patientId; // 设置当前患者ID
        fillPatientForm(patient);
        updateNavigationLinks(patientId);
    } catch (error) {
        console.error('Error loading patient info:', error);
        alert('加载患者信息失败');
    }
}

// 填充患者表单
function fillPatientForm(patient) {
    const form = document.getElementById('patientForm');
    form.elements['diagnosis'].value = patient.diagnosis || '';
    form.elements['disease_stage'].value = patient.disease_stage || '';
    form.elements['pathology_report'].value = patient.pathology_report || '';
    form.elements['staging'].value = patient.staging || '';
    form.elements['tnm_staging'].value = patient.tnm_staging || '';
    form.elements['lab_tests'].value = patient.lab_tests || '';
    form.elements['imaging_report'].value = patient.imaging_report || '';
    form.elements['symptoms'].value = patient.symptoms || '';
    form.elements['tongue'].value = patient.tongue || '';
    form.elements['pulse'].value = patient.pulse || '';
}

// 生成处方
function generatePrescription() {
    if (!currentPatientId) {
        alert('请先保存患者信息');
        return;
    }
    // 跳转到处方生成页面，并传递生成标志
    window.location.href = `/prescription?patient_id=${currentPatientId}&generate=true`;
}

// 保存患者信息
async function savePatient() {
    if (!currentPatientId) {
        alert('请先选择一个患者');
        return;
    }

    const form = document.getElementById('patientForm');
    const patientData = {
        diagnosis: form.elements['diagnosis'].value,
        disease_stage: form.elements['disease_stage'].value,
        pathology_report: form.elements['pathology_report'].value,
        staging: form.elements['staging'].value,
        tnm_staging: form.elements['tnm_staging'].value,
        lab_tests: form.elements['lab_tests'].value,
        imaging_report: form.elements['imaging_report'].value,
        symptoms: form.elements['symptoms'].value,
        tongue: form.elements['tongue'].value,
        pulse: form.elements['pulse'].value
    };

    try {
        console.log('Saving patient data:', patientData); // 添加日志
        const response = await fetch(`${API_BASE_URL}/patients/${currentPatientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error:', errorData); // 添加错误日志
            throw new Error(errorData.detail || '保存失败');
        }

        const result = await response.json();
        console.log('Save result:', result); // 添加日志
        alert('保存成功');
        getPatients(); // 刷新患者列表
    } catch (error) {
        console.error('Error saving patient:', error);
        alert('保存失败：' + error.message);
    }
}

// 页面加载时获取患者列表
document.addEventListener('DOMContentLoaded', getPatients); 