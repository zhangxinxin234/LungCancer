/**
 * 页面过渡动画效果
 */

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面加载动画
    initPageTransitions();

    // 初始化元素进入动画
    initElementAnimations();
});

// 初始化页面过渡动画
function initPageTransitions() {
    // 页面加载动画
    const mainContent = document.querySelector('main.container-fluid');
    if (mainContent) {
        setTimeout(() => {
            mainContent.style.opacity = '1';
            mainContent.style.transform = 'translateY(0)';
        }, 100);
    }
}

// 初始化元素进入动画
function initElementAnimations() {
    // 为卡片元素添加进入动画
    animateElements('.card', 'fadeInUp');

    // 为按钮添加轻微的进入动画
    animateElements('.btn', 'fadeIn', 100);

    // 为表单元素添加进入动画
    animateElements('input, select, textarea', 'fadeIn', 50);
}

// 元素动画函数
function animateElements(selector, animation, staggerDelay = 50) {
    const elements = document.querySelectorAll(selector);

    elements.forEach((element, index) => {
        // 如果元素已经有动画类，则跳过
        if (element.classList.contains('animated')) {
            return;
        }

        // 设置初始状态
        element.style.opacity = '0';

        if (animation === 'fadeInUp') {
            element.style.transform = 'translateY(20px)';
        }

        element.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        element.classList.add('animated');

        // 错开时间执行动画
        setTimeout(() => {
            element.style.opacity = '1';

            if (animation === 'fadeInUp') {
                element.style.transform = 'translateY(0)';
            }
        }, 100 + (index * staggerDelay));
    });
}

// 点击链接时的页面过渡动画
document.addEventListener('click', function(e) {
    const target = e.target.closest('a');
    if (target &&
        target.getAttribute('href') &&
        target.getAttribute('href').startsWith('/') &&
        !target.getAttribute('href').startsWith('/#') &&
        !e.ctrlKey && !e.metaKey) {

        e.preventDefault();
        const mainContent = document.querySelector('main.container-fluid');

        if (mainContent) {
            // 页面离开动画
            mainContent.style.opacity = '0';
            mainContent.style.transform = 'translateY(10px)';

            setTimeout(() => {
                window.location.href = target.getAttribute('href');
            }, 300);
        } else {
            window.location.href = target.getAttribute('href');
        }
    }
});

// 为动态加载的内容添加动画
function animateContent(container, delay = 0) {
    if (!container) return;

    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    container.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';

    setTimeout(() => {
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
    }, delay);
}

// 导出动画函数供其他JS文件使用
window.pageTransitions = {
    animateContent: animateContent,
    animateElements: animateElements
};