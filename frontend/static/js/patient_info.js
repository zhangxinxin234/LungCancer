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
        'Content-Type': 'application/json'
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
        // 新建患者时，清空表单并应用新建样式
        clearPatientForm();
        currentPatientId = null;
        updateNavigationLinks(null);

        // 应用新建患者样式
        const patientForm = document.getElementById('patientForm');
        if (patientForm) {
            patientForm.classList.add('new-patient-form');
        }

        // 显示"新建患者"标识
        const newPatientIndicator = document.getElementById('newPatientIndicator');
        if (newPatientIndicator) {
            newPatientIndicator.style.display = 'block';
        }
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
                showErrorNotification('请先选择要删除的患者');
            }
        });
    }

    // 设置ID筛选事件
    const patientIdFilter = document.getElementById('patientIdFilter');
    if (patientIdFilter) {
        patientIdFilter.addEventListener('input', async function() {
            await getPatients();
        });
    }
});

// 获取患者列表
async function getPatients() {
    if (!checkAuth()) return;
    try {
        console.log('开始获取患者列表...');
        const response = await fetch(`${API_BASE_URL}/patients/`, {
            headers: getAuthHeaders()
        });

        console.log(`患者列表响应状态: ${response.status}`);

        if (!response.ok) {
            throw new Error(`获取患者列表失败，状态码: ${response.status}`);
        }

        const responseText = await response.text();
        // console.log(`患者列表响应内容: ${responseText.substring(0, 100)}...`);

        let patients;
        try {
            patients = JSON.parse(responseText);
            console.log(`解析到 ${patients.length} 个患者`);
        } catch (parseError) {
            console.error('JSON解析错误:', parseError);
            throw new Error('无法解析服务器响应的JSON数据');
        }

        displayPatients(patients);
        return patients;
    } catch (error) {
        console.error('Error fetching patients:', error);
        showErrorNotification(`获取患者列表失败: ${error.message}`);
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

    // 获取筛选输入框的值
    const filterValue = document.getElementById('patientIdFilter').value.toLowerCase();

    patients.forEach(patient => {
        // 如果有筛选值，且患者ID不包含筛选值，则跳过此患者
        if (filterValue && !String(patient.id).toLowerCase().includes(filterValue)) {
            return;
        }
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
function showErrorNotification(message) {
    showNotification(message, 'error');
}

// 处理删除患者的点击事件
async function handleDeletePatient(patientId) {
    // 显示删除确认对话框
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    deleteModal.show();

    // 监听确认删除按钮的点击事件
    document.getElementById('confirmDeleteBtn').onclick = async () => {
        deleteModal.hide(); // 隐藏对话框

        // 确保认证有效
        if (!checkAuth()) {
            console.error('认证失败，无法删除患者');
            showErrorMessage('认证失败，请重新登录');
            return;
        }

        await deletePatient(patientId);
    };
}

// 执行删除患者操作
async function deletePatient(patientId) {
    try {
        console.log(`尝试删除患者，ID: ${patientId}`);

        // 显示加载动画
        showLoading();

        const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
            credentials: 'include'  // 确保包含凭据
        });

        console.log(`删除患者响应状态: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`删除患者错误: ${errorText}`);
            throw new Error(`删除患者失败，状态码: ${response.status}, 错误: ${errorText}`);
        }

        console.log('患者删除成功，正在获取最新患者列表...');

        // 获取最新的患者列表
        const patientsResponse = await fetch(`${API_BASE_URL}/patients/`, {
            headers: getAuthHeaders(),
            credentials: 'include'  // 确保包含凭据
        });

        if (!patientsResponse.ok) {
            throw new Error(`获取患者列表失败，状态码: ${patientsResponse.status}`);
        }

        const patients = await patientsResponse.json();
        console.log(`获取到 ${patients.length} 个患者`);

        // 如果还有其他患者
        if (patients && patients.length > 0) {
            // 对患者列表进行倒序排列，以便获取最新添加的患者
            patients.sort((a, b) => b.id - a.id);
            const latestPatient = patients[0];

            console.log(`加载最新患者，ID: ${latestPatient.id}`);

            // 无条件加载最新的患者
            currentPatientId = latestPatient.id;

            // 更新URL为最新患者的ID
            window.history.replaceState({}, '', `/patient_info?patient_id=${latestPatient.id}`);

            // 更新导航链接
            updateNavigationLinks(latestPatient.id);

            // 填充表单和显示患者卡片
            fillPatientForm(latestPatient);
            displayPatientCard(latestPatient);

            // 刷新患者列表
            displayPatients(patients);

            // 显示删除成功消息
            showDeleteNotification();
        } else {
            console.log('没有剩余患者，清空所有状态');

            // 如果没有患者了，清空所有状态
            document.getElementById('patientForm').reset();
            if (document.getElementById('patientInfo')) {
                document.getElementById('patientInfo').innerHTML = '<div class="alert alert-info">没有患者记录，请创建新患者。</div>';
            }

            currentPatientId = null;

            // 更新URL
            window.history.replaceState({}, '', '/patient_info');

            // 更新导航链接
            updateNavigationLinks(null);

            // 清空患者列表
            document.getElementById('patientList').innerHTML = '';
        }
    } catch (error) {
        console.error('删除患者过程中发生错误:', error);
        showErrorNotification(`删除患者时出错: ${error.message}`);
    } finally {
        // 隐藏加载动画
        hideLoading();
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
        console.log(`尝试加载患者信息，ID: ${patientId}`);

        // 尝试不带斜杠的URL
        const url = `${API_BASE_URL}/patients/${patientId}`;
        console.log(`请求URL: ${url}`);

        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        console.log(`响应状态: ${response.status}`);

        if (!response.ok) {
            throw new Error(`获取患者信息失败，状态码: ${response.status}`);
        }

        const responseText = await response.text();
        console.log(`响应内容: ${responseText.substring(0, 100)}...`);

        let patient;
        try {
            patient = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON解析错误:', parseError);
            throw new Error('无法解析服务器响应的JSON数据');
        }

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
        showErrorNotification(`获取患者信息失败: ${error.message}`);
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

// 创建新患者
function createNewPatient() {
    try {
        // 清空表单
        clearPatientForm();

        // 设置当前患者ID为null
        currentPatientId = null;

        // 更新URL为新建患者模式
        window.history.pushState({}, '', '/patient_info?new=true');

        // 更新导航链接
        updateNavigationLinks(null);

        // 清空患者信息卡片
        const patientInfo = document.getElementById('patientInfo');
        if (patientInfo) {
            patientInfo.innerHTML = '';
        }

        // 设置表单的新建样式
        const patientForm = document.getElementById('patientForm');
        if (patientForm) {
            patientForm.classList.add('new-patient-form');
        }

        // 显示"新建患者"标识
        const newPatientIndicator = document.getElementById('newPatientIndicator');
        if (newPatientIndicator) {
            newPatientIndicator.style.display = 'inline-block';
        }

        // 更新患者列表中的活动项
        updateActivePatientInList(null);

        // 滚动表单到视图中
        patientForm.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error creating new patient:', error);
        showErrorNotification('创建新患者失败');
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

    // 移除表单的新建样式
    const patientForm = document.getElementById('patientForm');
    if (patientForm) {
        patientForm.classList.remove('new-patient-form');
    }

    // 隐藏"新建患者"标识
    const newPatientIndicator = document.getElementById('newPatientIndicator');
    if (newPatientIndicator) {
        newPatientIndicator.style.display = 'none';
    }
}

// 保存患者信息
async function savePatient() {
    try {
        // 收集表单数据
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

        console.log('准备保存患者信息:', patientData);

        let url = `${API_BASE_URL}/patients/`;
        let method = 'POST';

        if (currentPatientId) {
            url = `${API_BASE_URL}/patients/${currentPatientId}/`;
            method = 'PUT';
        }

        console.log(`请求URL: ${url}, 方法: ${method}`);

        const response = await fetch(url, {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(patientData)
        });

        if (response.ok) {
            const savedPatient = await response.json();

            // 显示保存成功提示
            showSaveNotification();

            // 更新当前患者ID
            currentPatientId = savedPatient.id;

            // 更新URL（移除new参数，添加patient_id）
            window.history.replaceState({}, '', `/patient_info?patient_id=${savedPatient.id}`);

            // 更新导航链接
            updateNavigationLinks(savedPatient.id);

            // 显示患者卡片
            displayPatientCard(savedPatient);

            // 移除表单的新建样式
            const patientForm = document.getElementById('patientForm');
            if (patientForm) {
                patientForm.classList.remove('new-patient-form');
            }

            // 隐藏"新建患者"标识
            const newPatientIndicator = document.getElementById('newPatientIndicator');
            if (newPatientIndicator) {
                newPatientIndicator.style.display = 'none';
            }

            // 刷新患者列表
            await getPatients();
        } else {
            const errorText = await response.text();
            throw new Error(`保存失败: ${errorText}`);
        }
    } catch (error) {
        console.error('Error saving patient:', error);
        showErrorNotification(error.message || '保存失败');
    }
}

// 显示保存成功的中央提示
function showSaveNotification() {
    showNotification('保存成功', 'success');
}

// 显示删除成功的中央提示
function showDeleteNotification() {
    showNotification('删除成功', 'success');
}

// 通用的显示通知函数
function showNotification(message, type = 'success') {
    const notification = document.getElementById('saveNotification');
    if (!notification) return;

    // 更新通知内容和样式
    const notificationContent = notification.querySelector('.notification-content');
    const icon = notificationContent.querySelector('i');
    const span = notificationContent.querySelector('span');

    // 根据类型设置不同的图标和背景色
    if (type === 'success') {
        icon.className = 'bx bx-check-circle';
        notification.style.backgroundColor = 'rgba(72, 187, 120, 0.95)'; // 成功是绿色
    } else if (type === 'error') {
        icon.className = 'bx bx-error-circle';
        notification.style.backgroundColor = 'rgba(245, 101, 101, 0.95)'; // 错误是红色
    }

    // 更新消息文本
    span.textContent = message;

    // 显示通知
    notification.style.display = 'block';

    // 设置淡入效果
    setTimeout(() => {
        notification.style.opacity = '1';

        // 1.5秒后淡出并隐藏
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 200);
        }, 1500);
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
    // 首先检查认证状态
    if (!checkAuth()) {
        console.error('认证失败，无法生成处方');
        showErrorMessage('认证失败，请重新登录');
        return;
    }

    // 检查是否有选中的患者
    if (!currentPatientId) {
        showErrorMessage('请先选择或保存患者信息');
        return;
    }

    try {
        // 显示加载动画
        showLoading();

        console.log(`尝试为患者 ${currentPatientId} 生成处方`);

        const response = await fetch(`${API_BASE_URL}/patients/${currentPatientId}/generate-prescription`, {
            method: 'POST',
            headers: getAuthHeaders(),
            credentials: 'include'  // 确保包含凭据
        });

        console.log(`处方生成响应状态: ${response.status}`);

        if (!response.ok) {
            // 处理不同的错误状态
            switch (response.status) {
                case 401:
                    throw new Error('认证失败，请重新登录');
                case 403:
                    throw new Error('您没有权限生成处方');
                case 404:
                    throw new Error('找不到指定的患者信息');
                default:
                    const errorText = await response.text();
                    throw new Error(`处方生成失败: ${errorText || '未知错误'}`);
            }
        }

        // 处方生成成功，跳转到处方页面
        window.location.href = `/prescription?patient_id=${currentPatientId}`;
    } catch (error) {
        console.error('处方生成过程中发生错误:', error);
        showErrorMessage(error.message || '处方生成失败');
    } finally {
        // 确保无论成功失败都隐藏加载动画
        hideLoading();
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