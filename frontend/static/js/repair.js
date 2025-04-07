const API_BASE_URL = '/api/v1';
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
        await loadPatientPrescription(patientId);
        await loadLatestRepairRule();
    }
    await getPatients(); // 确保在页面加载时获取患者列表
});

// 获取患者列表
async function getPatients() {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/`, {
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include'
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
        showErrorNotification('获取患者列表失败：' + error.message);
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
    patientItem.className = 'card mb-2';
    patientItem.innerHTML = `
        <div class="card-body">
            <h6 class="card-title">患者ID: ${currentPatient.id}</h6>
            <p class="card-text">${currentPatient.diagnosis || '暂无诊断'}</p>
            <div class="btn-group">
                <button class="btn btn-sm btn-primary" onclick="selectPatient(${currentPatient.id})">查看</button>
            </div>
        </div>
    `;
    patientList.appendChild(patientItem);
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
        showErrorNotification('加载患者信息失败');
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

// 加载患者处方
async function loadPatientPrescription(patientId) {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('加载失败');
        }

        const patient = await response.json();

        // 显示原始处方和中成药
        document.getElementById('originalPrescription').textContent = patient.prescription || '';
        document.getElementById('originalMedicine').textContent = patient.chinese_medicine || '';

        // 如果有修复后的处方和中成药，也显示出来
        document.getElementById('repairedPrescription').value = patient.prescription_repair || '';
        document.getElementById('repairedMedicine').value = patient.medicine_repair || '';

        // 清空修复建议，除非是刚加载的修复后的处方
        if (!patient.prescription_repair) {
            document.getElementById('repairRules').value = '';
        }
    } catch (error) {
        console.error('Error loading patient prescription:', error);
        alert('加载处方失败：' + error.message);
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

// 修复处方
async function repairPrescription() {
    if (!currentPatientId) {
        showErrorNotification('请先选择一个患者');
        return;
    }

    const rules = document.getElementById('repairRules').value;
    if (!rules.trim()) {
        showErrorNotification('请输入修复规则');
        return;
    }

    try {
        showLoading(); // 显示加载动画

        const response = await fetch(`${API_BASE_URL}/patients/${currentPatientId}/repair-prescription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ rule_content: rules })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || '修复失败');
        }

        const result = await response.json();
        // 直接更新界面
        document.getElementById('repairedPrescription').value = result.prescription || '';
        document.getElementById('repairedMedicine').value = result.medicine || '';
    } catch (error) {
        console.error('Error repairing prescription:', error);
        showErrorNotification('修复失败：' + error.message);
    } finally {
        hideLoading(); // 隐藏加载动画
    }
}

// 采纳修复
async function adoptRepair() {
    if (!currentPatientId) {
        showErrorNotification('请先选择一个患者');
        return;
    }

    try {
        // 获取可能已编辑的处方和中成药内容
        const repairedPrescription = document.getElementById('repairedPrescription').value;
        const repairedMedicine = document.getElementById('repairedMedicine').value;

        const response = await fetch(`${API_BASE_URL}/patients/${currentPatientId}/adopt-repair`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                prescription: repairedPrescription,
                medicine: repairedMedicine
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || '采纳失败');
        }

        const result = await response.json();
        showSuccessNotification('采纳成功');
        await loadPatientPrescription(currentPatientId); // 重新加载处方信息
    } catch (error) {
        console.error('Error adopting repair:', error);
        showErrorNotification('采纳失败：' + error.message);
    }
}

// 加载最新的修复规则
async function loadLatestRepairRule() {
    try {
        const response = await fetch(`${API_BASE_URL}/patients/${currentPatientId}/latest-repair-rule`, {
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('加载修复规则失败');
        }

        const result = await response.json();
        if (result.rule_content) {
            document.getElementById('repairRules').value = result.rule_content;
            showSuccessNotification('规则加载成功'); // 添加成功提示
        } else {
            // 如果没有找到规则，加载默认规则
            document.getElementById('repairRules').value = `1. 放疗阶段需加：天冬12g、麦冬12g；
2. 化疗阶段需加：半夏12g、竹茹15g、阿胶珠6g；
3. 靶向治疗阶段加：生黄芪15g、炒白术12g、防风10g；
4. 所有阶段可加：红景天12g、灵芝15g、鸡血藤15g、白芍12g；
5. 恶性程度高（如Ki-67高、肿瘤标志物升高、淋巴转移）可加：山慈菇6g、红豆杉6g、重楼10g、猫抓草10g；
6. 脑转移：加钩藤12g、川牛膝10g、益智仁10g、猪苓15g、茯苓12g；
7. 肺部感染：蒲公英15g、银花12g；
8. 胸水：猪苓15g、茯苓12g；
9. 腹泻轻度：芡实15g，重度：诃子10g；
10. 腹胀：枳壳10g、大腹皮10g；
11. 失眠：炒枣仁10g、柏子仁10g；
12. 体虚或恶病质：加太子参15g或西洋参10g；
13. 护胃需求：可加露蜂房10g；
14. 中成药推荐，最多推荐两个：
    - 首推：
        - 肺1膏：适用于Ia期、轻症、稳定期；
        - 肺2膏：适用于II-IV期、进展期、转移；
    - 其次：
        - 西黄解毒丸：热毒壅盛、进展迅速；
        - 肺瘤平片、川贝粉：咳嗽痰多、痰湿壅肺；
        - 生血宝合剂：化疗后气血亏；
        - 贞芪扶正颗粒：体虚明显、纳差；
        - 血府逐瘀类：舌暗瘀斑、舌下静脉怒张。`;
        }
    } catch (error) {
        console.error('Error loading repair rules:', error);
        showErrorNotification('加载修复规则失败：' + error.message);
    }
}

// 保存修复规则
async function saveRepairRule() {
    if (!currentPatientId) {
        showErrorNotification('请先选择一个患者');
        return;
    }

    const rules = document.getElementById('repairRules').value;
    if (!rules.trim()) {
        showErrorNotification('请输入修复规则');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/patients/${currentPatientId}/save-repair-rule`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ rule_content: rules })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || '保存失败');
        }

        showSuccessNotification('修复规则保存成功');
    } catch (error) {
        console.error('Error saving repair rule:', error);
        showErrorNotification('保存失败：' + error.message);
    }
}

// 选择患者
async function selectPatient(patientId) {
    currentPatientId = patientId;
    updateNavigationLinks(patientId);
    await loadPatientPrescription(patientId);
    await loadLatestRepairRule();
    // 更新URL，但不刷新页面
    window.history.pushState({}, '', `/repair?patient_id=${patientId}`);
    await getPatients(); // 刷新患者列表以反映当前选择
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
            showSuccessNotification('患者删除成功');
            getPatients();
        } else {
            showErrorNotification('删除失败');
        }
    } catch (error) {
        console.error('Error deleting patient:', error);
        showErrorNotification('删除失败');
    }
}

// 新建患者
function createNewPatient() {
    window.location.href = '/patient_info';
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

// 返回到处方生成界面
function goBack() {
    const patientId = getUrlParam('patient_id');
    if (patientId) {
        window.location.href = `/prescription?patient_id=${patientId}`;
    } else {
        window.location.href = '/prescription';
    }
}