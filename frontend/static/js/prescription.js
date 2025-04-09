const API_BASE_URL = '/api/v1';
let currentPatientId = null;

// 检查认证状态
function checkAuth() {
    const token = getCookie('token');
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// 获取认证头部
function getAuthHeaders() {
    const token = getCookie('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
}

// 从cookie中获取token
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

// 从URL获取参数
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// 页面加载时的初始化
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
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
    if (!checkAuth()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/prescription`, {
            headers: getAuthHeaders()
        });
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
    if (!checkAuth()) return;
    try {
        const response = await fetch(`${API_BASE_URL}/patients/`, {
            headers: getAuthHeaders()
        });
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
            method: 'DELETE',
            headers: getAuthHeaders()
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

// 重新生成处方
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
            headers: getAuthHeaders(),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('处方生成失败');
        }

        const result = await response.json();

        // 更新界面显示
        document.getElementById('treatmentStage').textContent = result.western_treatment_stage || '';
        document.getElementById('prescription').value = result.prescription || '';
        document.getElementById('medicine').value = result.medicine || '';

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
        'cscoGuideline': document.getElementById('cscoGuideline')
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
        elements.prescription.value = prescription.prescription || '';
    }
    if (elements.medicine) {
        elements.medicine.value = prescription.medicine || '';
    }
    if (elements.treatmentStage) {
        elements.treatmentStage.textContent = prescription.western_treatment_stage || '';
    }
    if (elements.cscoGuideline) {
        displayCscoGuideline(prescription.csco_guideline);
    }
}

// 显示CSCO指南
function displayCscoGuideline(guideline) {
    const cscoGuidelineElement = document.getElementById('cscoGuideline');
    if (!cscoGuidelineElement) return;

    cscoGuidelineElement.innerHTML = marked.parse(guideline || '无可用的CSCO指南信息');
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

        // 根据当前治疗阶段设置相应的CSCO指南
        const treatmentStage = document.getElementById('treatmentStage').textContent;
        let cscoGuideline = '';

        // 根据治疗阶段设置对应的CSCO指南内容
        switch (treatmentStage.trim()) {
            case 'IIA期':
                cscoGuideline = '手术切除';
                break;
            case 'IIB期':
                cscoGuideline = '手术切除+辅助化疗';
                break;
            case 'IIIA期':
                cscoGuideline = '新辅助化疗+手术切除';
                break;
            default:
                cscoGuideline = '暂无指南';
        }

        const prescriptionData = {
            western_treatment_stage: treatmentStage,
            csco_guideline: cscoGuideline,
            prescription: document.getElementById('prescription').value,
            medicine: document.getElementById('medicine').value
        };

        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/prescription`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify(prescriptionData)
        });

        if (!response.ok) {
            throw new Error('保存失败');
        }

        // 显示全屏成功消息
        showSuccessNotification('处方保存成功');

    } catch (error) {
        console.error('Error saving prescription:', error);
        showErrorNotification('保存失败：' + error.message);
    } finally {
        hideLoading(); // 隐藏加载动画
    }
}

// 显示加载动画
function showLoading() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
    // 禁用所有按钮
    document.querySelectorAll('button').forEach(button => {
        button.disabled = true;
    });
}

// 隐藏加载动画
function hideLoading() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
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
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
            headers: getAuthHeaders()
        });
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
        <h5 class="mb-3" style="color: var(--primary-color); font-weight: 600; padding-bottom: 0.5rem;">
            <i class='bx bx-user-pin' style="font-size: 1.2rem; margin-right: 0.5rem;"></i>
            患者资料
        </h5>
        <div class="patient-info-content">
            <p><i class='bx bx-id-card'></i><strong>患者编号</strong><span>#${patient.id}</span></p>
            <p><i class='bx bx-plus-medical'></i><strong>西医诊断</strong><span>${patient.diagnosis || ''}</span></p>
            <p><i class='bx bx-time'></i><strong>现病程阶段</strong><span>${patient.disease_stage || ''}</span></p>
            <p><i class='bx bx-layer'></i><strong>分期</strong><span>${patient.staging || ''}</span></p>
            <p><i class='bx bx-scatter-chart'></i><strong>TNM分期</strong><span>${patient.tnm_staging || ''}</span></p>
            <p><i class='bx bx-file'></i><strong>病理报告</strong><span>${patient.pathology_report || ''}</span></p>
            <p><i class='bx bx-test-tube'></i><strong>实验室检查</strong><span>${patient.lab_tests || ''}</span></p>
            <p><i class='bx bx-image'></i><strong>影像学报告</strong><span>${patient.imaging_report || ''}</span></p>
            <p><i class='bx bx-body'></i><strong>症状</strong><span>${patient.symptoms || ''}</span></p>
            <p><i class='bx bx-message-rounded-detail'></i><strong>舌苔</strong><span>${patient.tongue || ''}</span></p>
            <p><i class='bx bx-pulse'></i><strong>脉象</strong><span>${patient.pulse || ''}</span></p>
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

// 显示全屏成功通知
function showSuccessNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="success-icon">
            <i class='bx bx-check'></i>
        </div>
        <div class="success-message">${message}</div>
    `;

    // 添加到body
    document.body.appendChild(notification);

    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // 1秒后隐藏并移除
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300); // 等待淡出动画完成
    }, 1000);
}

// 显示全屏错误通知
function showErrorNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'success-notification error-notification';
    notification.innerHTML = `
        <div class="success-icon error-icon">
            <i class='bx bx-x'></i>
        </div>
        <div class="success-message">${message}</div>
    `;

    // 添加到body
    document.body.appendChild(notification);

    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // 1秒后隐藏并移除
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300); // 等待淡出动画完成
    }, 1000);
}