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
    const form = document.getElementById('patientForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            await savePatient();
        });
    }

    // 获取患者列表
    await getPatients();
});

// 获取患者列表
async function getPatients() {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/`);
        if (!response.ok) {
            throw new Error('获取患者列表失败');
        }
        const patients = await response.json();
        displayPatients(patients);
    } catch (error) {
        console.error('Error fetching patients:', error);
        alert('获取患者列表失败');
    }
}

// 显示患者列表
function displayPatients(patients) {
    const patientList = document.getElementById('patientList');
    if (!patientList) return;

    patientList.innerHTML = '';

    // 对患者列表进行倒序排列
    patients.sort((a, b) => b.id - a.id);

    patients.forEach(patient => {
        const patientItem = document.createElement('div');
        patientItem.className = 'patient-item';
        if (patient.id === currentPatientId) {
            patientItem.classList.add('active');
        }

        patientItem.innerHTML = `
            <div class="patient-header">
                <span class="patient-id">患者 #${patient.id}</span>
            </div>
            <div class="diagnosis">${patient.diagnosis || '暂无诊断'}</div>
            <div class="btn-group">
                <button class="btn btn-primary" onclick="loadPatientInfo(${patient.id})">
                    <i class="bx bx-show"></i> 查看详情
                </button>
                <button class="btn btn-outline-danger" onclick="deletePatient(${patient.id})">
                    <i class="bx bx-trash"></i> 删除
                </button>
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
            if (currentPatientId === patientId) {
                createNewPatient();
            }
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
    } else {
        prescriptionLink.href = '/prescription';
        repairLink.href = '/repair';
        patientInfoLink.href = '/patient_info';
    }
}

// 加载患者信息
async function loadPatientInfo(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}`);
        if (!response.ok) {
            throw new Error('获取患者信息失败');
        }
        const patient = await response.json();
        currentPatientId = patientId; // 设置当前患者ID
        fillPatientForm(patient);
        displayPatientCard(patient);
        updateNavigationLinks(patientId);
        // 更新URL
        window.history.pushState({}, '', `/patient_info?patient_id=${patientId}`);
        // 刷新患者列表以更新选中状态
        await getPatients();
    } catch (error) {
        console.error('Error loading patient info:', error);
        alert('加载患者信息失败');
    }
}

// 填充患者表单
function fillPatientForm(patient) {
    const elements = {
        'diagnosis': patient.diagnosis,
        'diseaseStage': patient.disease_stage,
        'pathologyReport': patient.pathology_report,
        'staging': patient.staging,
        'tnmStaging': patient.tnm_staging,
        'labTests': patient.lab_tests,
        'imagingReport': patient.imaging_report,
        'symptoms': patient.symptoms,
        'tongue': patient.tongue,
        'pulse': patient.pulse
    };

    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
        }
    }
}

// 新建患者
function createNewPatient() {
    // 清空表单
    const form = document.getElementById('patientForm');
    if (form) {
        form.reset();
    }
    // 清除当前患者ID
    currentPatientId = null;
    // 更新URL，移除patient_id参数
    window.history.pushState({}, '', '/patient_info');
    // 更新导航链接
    updateNavigationLinks(null);
    // 刷新患者列表以更新选中状态
    getPatients();
}

// 保存患者信息
async function savePatient() {
    const patientData = {
        diagnosis: document.getElementById('diagnosis').value,
        disease_stage: document.getElementById('diseaseStage').value,
        pathology_report: document.getElementById('pathologyReport').value,
        staging: document.getElementById('staging').value,
        tnm_staging: document.getElementById('tnmStaging').value,
        lab_tests: document.getElementById('labTests').value,
        imaging_report: document.getElementById('imagingReport').value,
        symptoms: document.getElementById('symptoms').value,
        tongue: document.getElementById('tongue').value,
        pulse: document.getElementById('pulse').value
    };

    try {
        let url = `${API_BASE_URL}/patients`;
        let method = 'POST';

        if (currentPatientId) {
            url = `${API_BASE_URL}/patients/${currentPatientId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(patientData)
        });

        if (response.ok) {
            const savedPatient = await response.json();
            alert('保存成功');

            if (!currentPatientId) {
                // 如果是新建患者，保存后跳转到该患者的页面
                window.location.href = `/patient_info?patient_id=${savedPatient.id}`;
            } else {
                // 如果是更新患者，刷新患者列表
                await getPatients();
            }
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        console.error('Error saving patient:', error);
        alert('保存失败');
    }
}

// 生成处方
async function generatePrescription() {
    if (!currentPatientId) {
        alert('请先保存患者信息');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/patients/${currentPatientId}/generate-prescription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // 直接跳转到处方页面
            window.location.href = `/prescription?patient_id=${currentPatientId}`;
        } else {
            throw new Error('处方生成失败');
        }
    } catch (error) {
        console.error('Error generating prescription:', error);
        alert('处方生成失败');
    }
}

// 显示患者卡片信息
function displayPatientCard(patient) {
    const patientInfo = document.getElementById('patientInfo');
    if (!patientInfo) return;

    patientInfo.innerHTML = `
        <div class="patient-info-card">
            <h4>患者编号：#${patient.id}</h4>
            <div class="info-section">
                <p><strong>西医诊断：</strong>${patient.diagnosis || '暂无'}</p>
                <p><strong>现病程阶段：</strong>${patient.disease_stage || '暂无'}</p>
            </div>
            <div class="info-section">
                <p><strong>病理报告：</strong>${patient.pathology_report || '暂无'}</p>
                <p><strong>分期：</strong>${patient.staging || '暂无'}</p>
                <p><strong>TNM分期：</strong>${patient.tnm_staging || '暂无'}</p>
            </div>
            <div class="info-section">
                <p><strong>实验室检查：</strong>${patient.lab_tests || '暂无'}</p>
                <p><strong>影像学报告：</strong>${patient.imaging_report || '暂无'}</p>
            </div>
            <div class="info-section">
                <p><strong>症状：</strong>${patient.symptoms || '暂无'}</p>
                <div class="row">
                    <div class="col-6">
                        <p><strong>舌苔：</strong>${patient.tongue || '暂无'}</p>
                    </div>
                    <div class="col-6">
                        <p><strong>脉象：</strong>${patient.pulse || '暂无'}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}