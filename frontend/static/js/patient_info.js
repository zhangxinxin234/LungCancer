const API_BASE_URL = '/api/v1';
let currentPatientId = null;

// 从URL获取参数
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// 页面加载时的初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 获取患者列表
    await getPatients();

    const patientId = getUrlParam('patient_id');
    const isNewPatient = getUrlParam('new') === 'true';

    if (patientId) {
        currentPatientId = patientId;
        await loadPatientInfo(patientId);
        updateNavigationLinks(patientId);
    } else if (!isNewPatient) {
        // 只有在不是新建患者的情况下，才加载最新的患者信息
        await loadLatestPatient();
    } else {
        // 新建患者时，清空表单
        clearPatientForm();
        currentPatientId = null;
        updateNavigationLinks(null);
    }

    // 设置表单提交事件
    const actionForm = document.getElementById('actionForm');
    if (actionForm) {
        actionForm.addEventListener('submit', async function(e) {
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
        return patients;
    } catch (error) {
        console.error('Error fetching patients:', error);
        showErrorMessage('获取患者列表失败');
        return [];
    }
}

// 加载最新的患者信息
async function loadLatestPatient() {
    const patients = await getPatients();
    if (patients.length > 0) {
        // 对患者列表进行倒序排列，以便获取最新添加的患者
        patients.sort((a, b) => b.id - a.id);
        const latestPatient = patients[0];
        await loadPatientInfo(latestPatient.id);
        updateNavigationLinks(latestPatient.id);
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

// 显示错误提示
function showErrorMessage(message) {
    // 使用原生的alert来显示错误信息
    alert(message);
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

        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // 如果删除的是当前查看的患者，立即更新URL
            if (deletingCurrentPatient) {
                // 立即更新URL和状态
                currentPatientId = null;
                window.history.replaceState({}, '', '/patient_info');
                updateNavigationLinks(null);
            }

            // 获取最新的患者列表
            const patientsResponse = await fetch(`${API_BASE_URL}/patients/`);
            if (patientsResponse.ok) {
                const patients = await patientsResponse.json();

                // 如果还有其他患者
                if (patients && patients.length > 0) {
                    // 对患者列表进行倒序排列，以便获取最新添加的患者
                    patients.sort((a, b) => b.id - a.id);
                    const firstPatientId = patients[0].id;

                    // 如果删除的是当前患者，或者当前没有选中患者，加载第一个患者
                    if (deletingCurrentPatient || !currentPatientId) {
                        // 加载新的患者信息并更新URL
                        await loadPatientInfo(firstPatientId);
                    } else {
                        // 如果删除的不是当前患者，只需刷新列表
                        await getPatients();
                    }
                } else {
                    // 如果没有患者了，清空所有状态
                    document.getElementById('patientForm').reset();
                    if (document.getElementById('patientInfo')) {
                        document.getElementById('patientInfo').innerHTML = '';
                    }
                    currentPatientId = null;
                    // 更新URL（使用replaceState避免在历史记录中留下多余条目）
                    window.history.replaceState({}, '', '/patient_info');
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
        showErrorMessage('删除患者失败');
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
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}/`);
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
            showErrorMessage('获取患者信息失败');
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

// 清空患者表单
function clearPatientForm() {
    const elements = [
        'diagnosis',
        'diseaseStage',
        'pathologyReport',
        'staging',
        'tnmStaging',
        'labTests',
        'imagingReport',
        'symptoms',
        'tongue',
        'pulse'
    ];

    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
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
async function createNewPatient() {
    try {
        // 清空表单并更新URL
        clearPatientForm();
        window.history.pushState({}, '', '/patient_info?new=true');
        currentPatientId = null;
        updateNavigationLinks(null);

        // 清空患者信息卡片
        const patientInfo = document.getElementById('patientInfo');
        if (patientInfo) {
            patientInfo.innerHTML = '';
        }

        // 更新患者列表中的活动项
        updateActivePatientInList(null);
    } catch (error) {
        console.error('Error creating new patient:', error);
        showErrorMessage('创建新患者失败');
    } finally {
        // 隐藏加载指示器
        hideLoading();
    }
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
        let url = `${API_BASE_URL}/patients/`;  // 添加末尾斜杠
        let method = 'POST';

        if (currentPatientId) {
            url = `${API_BASE_URL}/patients/${currentPatientId}/`;  // 添加末尾斜杠
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

            // 显示中央保存成功提示
            showSaveNotification();

            // 更新当前患者ID
            currentPatientId = savedPatient.id;

            // 更新URL（移除new参数，添加patient_id）
            window.history.replaceState({}, '', `/patient_info?patient_id=${savedPatient.id}`);

            // 更新导航链接
            updateNavigationLinks(savedPatient.id);

            // 显示患者卡片
            displayPatientCard(savedPatient);

            // 刷新患者列表
            await getPatients();
        } else {
            throw new Error('保存失败');
        }
    } catch (error) {
        console.error('Error saving patient:', error);
            showErrorMessage('保存失败');
    }
}

// 显示保存成功的中央提示
function showSaveNotification() {
    const notification = document.getElementById('saveNotification');
    if (!notification) return;

    // 显示通知
    notification.style.display = 'block';

    // 设置淡入效果
    setTimeout(() => {
        notification.style.opacity = '1';

        // 0.5秒后淡出并隐藏
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 200);
        }, 500);
    }, 10);
}

// 显示加载动画
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

// 隐藏加载动画
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// 生成处方
async function generatePrescription() {
            if (!currentPatientId) {
                showErrorMessage('请先保存患者信息');
                return;
            }

    try {
        // 显示加载动画
        showLoading();

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
            hideLoading(); // 出错时隐藏加载动画
            throw new Error('处方生成失败');
        }
    } catch (error) {
        hideLoading(); // 确保出错时也隐藏加载动画
        console.error('Error generating prescription:', error);
            showErrorMessage('处方生成失败');
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