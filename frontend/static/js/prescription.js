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
        await loadPatientInfo(patientId); // 加载患者信息
        await loadExistingPrescription(patientId);
        
        // 只有当从患者信息页面点击"生成处方"时才生成新处方
        const shouldGenerate = getUrlParam('generate');
        if (shouldGenerate === 'true') {
            await generatePrescription();
        }
    }
    await getPatients(); // 确保在页面加载时获取患者列表
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
    } else {
        prescriptionLink.href = '/prescription';
        repairLink.href = '/repair';
        patientInfoLink.href = '/patient_info';
    }
}

// 加载现有处方
async function loadExistingPrescription(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/prescription`);
        if (!response.ok) {
            if (response.status === 404) {
                // 如果没有找到处方，清空显示
                displayPrescription({
                    prescription: '',
                    medicine: '',
                    western_treatment_stage: '',
                    csco_guideline: ''
                });
                return;
            }
            throw new Error('加载处方失败');
        }
        const prescription = await response.json();
        displayPrescription(prescription);
    } catch (error) {
        console.error('Error loading existing prescription:', error);
        alert('加载现有处方失败');
    }
}

// 获取患者列表
async function getPatients() {
    try {
        const response = await fetch(`${API_BASE_URL}/patients`);
        if (!response.ok) {
            throw new Error('获取患者列表失败');
        }
        const data = await response.json();
        // 确保data是数组
        const patients = Array.isArray(data) ? data : [];
        displayPatients(patients);
    } catch (error) {
        console.error('Error fetching patients:', error);
        alert('获取患者列表失败：' + error.message);
    }
}

// 显示患者列表
function displayPatients(patients) {
    const patientList = document.getElementById('patientList');
    if (!patientList) return; // 确保元素存在
    patientList.innerHTML = '';
    
    if (!currentPatientId) return; // 如果没有当前患者ID，不显示任何内容
    
    // 只显示当前患者
    const currentPatient = patients.find(p => String(p.id) === String(currentPatientId));
    if (!currentPatient) return;

    const patientItem = document.createElement('div');
    patientItem.className = 'patient-item active';
    patientItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <strong>患者 #${currentPatient.id}</strong>
                <div class="text-muted small">${currentPatient.diagnosis || '暂无诊断'}</div>
            </div>
            <div class="btn-group">
                <button class="btn btn-sm btn-primary" onclick="loadPatientPrescription(${currentPatient.id})">
                    <i class="bx bx-refresh"></i> 刷新
                </button>
            </div>
        </div>
    `;
    patientList.appendChild(patientItem);
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
async function generatePrescription() {
    const patientId = getUrlParam('patient_id');
    if (!patientId) {
        alert('未找到患者信息');
        return;
    }

    try {
        showLoading(); // 显示加载动画

        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/generate-prescription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('处方生成失败');
        }

        const result = await response.json();
        
        // 更新界面显示
        document.getElementById('treatmentStage').textContent = result.western_treatment_stage || '';
        document.getElementById('cscoGuidelines').textContent = result.csco_guideline || '';
        document.getElementById('prescription').textContent = result.prescription || '';
        document.getElementById('medicine').textContent = result.medicine || '';

    } catch (error) {
        console.error('Error generating prescription:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger mt-3';
        errorMessage.textContent = '生成失败：' + error.message;
        document.getElementById('prescription').parentNode.appendChild(errorMessage);
        setTimeout(() => {
            errorMessage.remove();
        }, 3000);
    } finally {
        hideLoading(); // 隐藏加载动画
    }
}

// 显示处方
function displayPrescription(prescription) {
    if (!prescription) return;
    
    const elements = {
        'prescription': document.getElementById('prescription'),
        'medicine': document.getElementById('medicine'),
        'treatmentStage': document.getElementById('treatmentStage'),
        'cscoGuidelines': document.getElementById('cscoGuidelines')
    };

    // 检查所有需要的元素是否存在
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Element with id '${key}' not found`);
            continue;
        }
    }

    // 设置内容
    if (elements.prescription) {
        elements.prescription.textContent = prescription.prescription || '';
    }
    if (elements.medicine) {
        elements.medicine.textContent = prescription.medicine || '';
    }
    if (elements.treatmentStage) {
        elements.treatmentStage.textContent = prescription.western_treatment_stage || '';
    }
    if (elements.cscoGuidelines) {
        elements.cscoGuidelines.textContent = prescription.csco_guideline || '';
    }
}

// 保存处方
async function savePrescription() {
    const patientId = getUrlParam('patient_id');
    if (!patientId) {
        alert('未找到患者信息');
        return;
    }

    try {
        showLoading(); // 显示加载动画

        const prescriptionData = {
            western_treatment_stage: document.getElementById('treatmentStage').textContent,
            csco_guideline: document.getElementById('cscoGuidelines').textContent,
            prescription: document.getElementById('prescription').textContent,
            medicine: document.getElementById('medicine').textContent
        };

        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/prescription`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(prescriptionData)
        });

        if (!response.ok) {
            throw new Error('保存失败');
        }

        // 显示成功消息
        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success mt-3';
        successMessage.textContent = '处方保存成功';
        document.getElementById('prescription').parentNode.appendChild(successMessage);
        setTimeout(() => {
            successMessage.remove();
        }, 3000);

    } catch (error) {
        console.error('Error saving prescription:', error);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger mt-3';
        errorMessage.textContent = '保存失败：' + error.message;
        document.getElementById('prescription').parentNode.appendChild(errorMessage);
        setTimeout(() => {
            errorMessage.remove();
        }, 3000);
    } finally {
        hideLoading(); // 隐藏加载动画
    }
}

// 显示加载动画
function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.add('active');
    }
    // 禁用所有按钮
    document.querySelectorAll('button').forEach(button => {
        button.disabled = true;
    });
}

// 隐藏加载动画
function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.remove('active');
    }
    // 启用所有按钮
    document.querySelectorAll('button').forEach(button => {
        button.disabled = false;
    });
}

// 加载患者处方
async function loadPatientPrescription(patientId) {
    try {
        currentPatientId = patientId; // 设置当前患者ID
        updateNavigationLinks(patientId);
        await loadExistingPrescription(patientId);
        await getPatients(); // 刷新患者列表以反映当前选择
    } catch (error) {
        console.error('Error loading patient prescription:', error);
        alert('加载处方失败');
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
        displayPatientInfo(patient);
    } catch (error) {
        console.error('Error loading patient info:', error);
        alert('加载患者信息失败');
    }
}

// 显示患者信息
function displayPatientInfo(patient) {
    const patientInfo = document.getElementById('patientInfo');
    if (!patientInfo) return;

    patientInfo.innerHTML = `
        <div class="patient-info-column">
            <p><strong>患者编号：</strong>#${patient.id}</p>
            <p><strong>西医诊断：</strong>${patient.diagnosis || '暂无'}</p>
            <p><strong>现病程阶段：</strong>${patient.disease_stage || '暂无'}</p>
            <p><strong>分期：</strong>${patient.staging || '暂无'}</p>
            <p><strong>TNM分期：</strong>${patient.tnm_staging || '暂无'}</p>
            <p><strong>病理报告：</strong>${patient.pathology_report || '暂无'}</p>
            <p><strong>实验室检查：</strong>${patient.lab_tests || '暂无'}</p>
            <p><strong>影像学报告：</strong>${patient.imaging_report || '暂无'}</p>
            <p><strong>症状：</strong>${patient.symptoms || '暂无'}</p>
            <p><strong>舌苔：</strong>${patient.tongue || '暂无'}</p>
            <p><strong>脉象：</strong>${patient.pulse || '暂无'}</p>
        </div>
    `;
}

// 跳转到处方修复界面
function goToRepair() {
    const patientId = getUrlParam('patient_id');
    if (patientId) {
        window.location.href = `/repair?patient_id=${patientId}`;
    } else {
        alert('未找到患者信息');
    }
}

// 返回到患者信息界面
function goBack() {
    const patientId = getUrlParam('patient_id');
    if (patientId) {
        window.location.href = `/patient_info?patient_id=${patientId}`;
    } else {
        window.location.href = '/patient_info';
    }
} 