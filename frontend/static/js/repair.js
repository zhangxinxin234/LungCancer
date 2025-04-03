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
        await loadPatientPrescription(patientId);
    }
    await getPatients();
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
        document.getElementById('repairedPrescription').textContent = patient.prescription_repair || '';
        document.getElementById('repairedMedicine').textContent = patient.medicine_repair || '';
        document.getElementById('repairRules').value = patient.repair_rules || '';
        
        // 清空修复建议，除非是刚加载的修复后的处方
        if (!patient.prescription_repair) {
            document.getElementById('repairRules').value = '';
        }
    } catch (error) {
        console.error('Error loading patient prescription:', error);
        alert('加载处方失败：' + error.message);
    }
}

// 获取患者列表
async function getPatients() {
    try {
        const response = await fetch(`${API_BASE_URL}/patients`, {
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('获取患者列表失败');
        }

        const patients = await response.json();
        displayPatients(patients);
    } catch (error) {
        console.error('Error fetching patients:', error);
        alert('获取患者列表失败：' + error.message);
    }
}

// 显示患者列表
function displayPatients(patients) {
    const patientList = document.getElementById('patientList');
    patientList.innerHTML = '';
    
    patients.sort((a, b) => b.id - a.id);
    
    patients.forEach(patient => {
        const patientItem = document.createElement('div');
        patientItem.className = 'card mb-2';
        const isActive = patient.id === currentPatientId;
        patientItem.innerHTML = `
            <div class="card-body ${isActive ? 'bg-light' : ''}">
                <h6 class="card-title">患者ID: ${patient.id}</h6>
                <p class="card-text">${patient.diagnosis || '暂无诊断'}</p>
                <div class="btn-group">
                    <button class="btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}" onclick="selectPatient(${patient.id})">查看</button>
                    <button class="btn btn-sm btn-danger ms-2" onclick="deletePatient(${patient.id})">删除</button>
                </div>
            </div>
        `;
        patientList.appendChild(patientItem);
    });
}

// 选择患者
async function selectPatient(patientId) {
    currentPatientId = patientId;
    updateNavigationLinks(patientId);
    await loadPatientPrescription(patientId);
    // 更新URL，但不刷新页面
    window.history.pushState({}, '', `/repair?patient_id=${patientId}`);
    // 重新渲染患者列表以更新选中状态
    await getPatients();
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
            getPatients();
        } else {
            alert('删除失败');
        }
    } catch (error) {
        console.error('Error deleting patient:', error);
        alert('删除失败');
    }
}

// 修复处方
async function repairPrescription() {
    if (!currentPatientId) {
        alert('请先选择一个患者');
        return;
    }

    const rules = document.getElementById('repairRules').value;

    try {
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
        document.getElementById('repairedPrescription').textContent = result.prescription;
        document.getElementById('repairedMedicine').textContent = result.medicine;
        alert('修复成功');
    } catch (error) {
        console.error('Error repairing prescription:', error);
        alert('修复失败：' + error.message);
    }
}

// 采纳修复
async function adoptRepair() {
    if (!currentPatientId) {
        alert('请先选择一个患者');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/patients/${currentPatientId}/adopt-repair`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || '采纳失败');
        }

        const result = await response.json();
        alert('采纳成功');
        await loadPatientPrescription(currentPatientId); // 重新加载处方信息
    } catch (error) {
        console.error('Error adopting repair:', error);
        alert('采纳失败：' + error.message);
    }
} 