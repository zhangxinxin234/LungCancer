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

    // 设置删除按钮事件
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function() {
            if (currentPatientId) {
                await handleDeletePatient(currentPatientId);
            } else {
                showToast('请先选择要删除的患者', 'error');
            }
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
        showToast('获取患者列表失败', 'error');
    }
}

// 显示患者列表
function displayPatients(patients) {
    const patientList = document.getElementById('patientList');
    if (!patientList) return;

    patientList.innerHTML = '';

    // 对患者列表进行倒序排列
    patients.sort((a, b) => b.id - a.id);

    console.log(`正在显示患者列表，当前选中的患者ID: ${currentPatientId}`);

    patients.forEach(patient => {
        const patientItem = document.createElement('div');
        patientItem.className = 'patient-item';
        patientItem.dataset.id = String(patient.id); // 添加 data-id 属性，统一使用字符串

        // 统一转换为字符串进行比较
        if (String(patient.id) === String(currentPatientId)) {
            patientItem.classList.add('active');
            console.log(`标记患者 ${patient.id} 为活动状态`);
        }

        patientItem.innerHTML = `
            <div class="patient-info">
                <div class="patient-header">
                    <span class="patient-id">患者 #${patient.id}</span>
                </div>
                <div class="diagnosis">${patient.diagnosis || '暂无诊断'}</div>
            </div>
            <div class="btn-group">
                <button class="btn btn-light-blue" onclick="loadPatientInfo(${patient.id})">
                    <i class="bx bx-show"></i>查看
                </button>
                <button class="btn btn-outline-danger" onclick="handleDeletePatient(${patient.id})">
                    <i class="bx bx-trash"></i>删除
                </button>
            </div>
        `;
        patientList.appendChild(patientItem);
    });
}

// 显示提示信息
function showToast(message, type = 'info') {
    // 创建 toast 容器（如果不存在）
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1060;
        `;
        document.body.appendChild(toastContainer);
    }

    // 创建新的 toast 元素
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    // 添加到容器
    toastContainer.appendChild(toast);

    // 初始化 Bootstrap toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });

    // 显示 toast
    bsToast.show();

    // toast 隐藏后删除元素
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// 处理删除患者的点击事件
async function handleDeletePatient(patientId) {
    if (!confirm('确定要删除这个患者吗？')) {
        return;
    }
    await deletePatient(patientId);
}

// 执行删除患者操作
async function deletePatient(patientId) {
    try {
        // 记录删除前的当前患者ID，用于后续比较
        const deletingCurrentPatient = String(currentPatientId) === String(patientId);

        const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('患者删除成功', 'success');

            // 获取最新的患者列表
            const patientsResponse = await fetch(`${API_BASE_URL}/patients/`);
            if (patientsResponse.ok) {
                const patients = await patientsResponse.json();

                // 如果有患者，选择第一个
                if (patients && patients.length > 0) {
                    // 对患者列表进行倒序排列，以便获取最新添加的患者
                    patients.sort((a, b) => b.id - a.id);
                    const firstPatientId = patients[0].id;

                    // 如果删除的是当前患者，或者当前没有选中患者，加载第一个患者
                    if (deletingCurrentPatient || !currentPatientId) {
                        console.log("删除的是当前患者，正在更新URL和加载新患者...");

                        // 先清除当前患者ID，确保URL和状态完全更新
                        currentPatientId = null;

                        // 立即更新URL，避免显示已删除的患者ID
                        window.history.pushState({}, '', '/patient_info');

                        // 然后加载新的患者信息
                        await loadPatientInfo(firstPatientId);
                    } else {
                        // 如果删除的不是当前患者，只需刷新列表
                        console.log("删除的不是当前患者，仅刷新列表...");
                        await getPatients();
                    }
                } else {
                    // 如果没有患者了，清空表单并重置状态
                    document.getElementById('patientForm').reset();
                    if (document.getElementById('patientInfo')) {
                        document.getElementById('patientInfo').innerHTML = '';
                    }
                    currentPatientId = null;
                    // 更新URL
                    window.history.pushState({}, '', '/patient_info');
                    // 更新导航链接
                    updateNavigationLinks(null);
                    // 清空患者列表
                    document.getElementById('patientList').innerHTML = '';
                }
            }
        } else {
            throw new Error('删除患者失败');
        }
    } catch (error) {
        console.error('Error deleting patient:', error);
        showToast('删除患者失败', 'error');
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

        // 设置当前患者ID
        currentPatientId = patientId;

        // 填充表单和显示患者卡片
        fillPatientForm(patient);
        displayPatientCard(patient);

        // 更新URL
        window.history.pushState({}, '', `/patient_info?patient_id=${patientId}`);

        // 更新导航链接
        updateNavigationLinks(patientId);

        // 更新患者列表中的活动项
        updateActivePatientInList(patientId);

        // 刷新患者列表以更新选中状态
        await getPatients();
    } catch (error) {
        console.error('Error loading patient info:', error);
        showToast('获取患者信息失败', 'error');
    }
}

// 更新患者列表中的活动项
function updateActivePatientInList(patientId) {
    // 移除所有活动项
    const activeItems = document.querySelectorAll('.patient-item.active');
    activeItems.forEach(item => item.classList.remove('active'));

    // 设置当前患者为活动项
    if (patientId) {
        const currentItem = document.querySelector(`.patient-item[data-id="${patientId}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
        }
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
            showToast('保存成功', 'success');

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
        showToast('保存失败', 'error');
    }
}

// 生成处方
async function generatePrescription() {
    if (!currentPatientId) {
        showToast('请先保存患者信息', 'error');
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
        showToast('处方生成失败', 'error');
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