// Module script for Login page: Firebase init, handlers, validation, and UI helpers
// Loads as <script type="module" src="js/login.js"></script>

// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Firebase configuration (optionally override via window.AppConfig.Firebase.config)
const defaultFirebaseConfig = {
	apiKey: "AIzaSyCddND9ciUpeL3xTpWTUMyQ0TG9FyUCdiU",
	authDomain: "gen-lang-client-0595612537.firebaseapp.com",
	projectId: "gen-lang-client-0595612537",
	storageBucket: "gen-lang-client-0595612537.firebasestorage.app",
	messagingSenderId: "1022447215307",
	appId: "1:1022447215307:web:5fbf39694b90d420d2314e",
};

const firebaseConfig = (typeof window !== 'undefined' && window.AppConfig && window.AppConfig.Firebase && window.AppConfig.Firebase.config)
	? window.AppConfig.Firebase.config
	: defaultFirebaseConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Expose for inline handlers or other scripts
window.auth = auth;
window.db = db;

// Validation functions
function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

function isValidPhone(phone) {
	const phoneRegex = /^[0-9]{10,11}$/;
	return phoneRegex.test(String(phone || '').replace(/\s/g, ''));
}

function showFieldError(fieldName, message) {
	const field = document.querySelector(`[name="${fieldName}"]`);
	if (!field) return;
	field.classList.add('error');

	const existingError = field.parentNode.querySelector('.error-message');
	if (existingError) existingError.remove();

	const errorDiv = document.createElement('div');
	errorDiv.className = 'error-message';
	errorDiv.innerHTML = `<span class="material-symbols-outlined">error</span>${message}`;
	field.parentNode.appendChild(errorDiv);
}

function clearErrors() {
	document.querySelectorAll('.form-input.error, .form-select.error').forEach(f => f.classList.remove('error'));
	document.querySelectorAll('.error-message').forEach(el => el.remove());
	document.querySelectorAll('.success-message').forEach(el => el.remove());
}

function showToast(message, type = 'success') {
	const existingToast = document.querySelector('.toast');
	if (existingToast) existingToast.remove();

	const toast = document.createElement('div');
	toast.className = `toast ${type}`;
	const icon = type === 'success' ? 'check_circle' : 'error';
	toast.innerHTML = `
		<div class="success-checkmark">
			<span class="material-symbols-outlined">${icon}</span>
		</div>
		${message}
	`;
	document.body.appendChild(toast);
	requestAnimationFrame(() => toast.classList.add('show'));
	setTimeout(() => {
		toast.classList.remove('show');
		setTimeout(() => toast.remove(), 300);
	}, 3000);
}

function showError(message) { showToast(message, 'error'); }

function showSuccess(message) {
	showToast(message, 'success');
	const activeForm = document.querySelector('.form-section.active');
	if (activeForm) activeForm.classList.add('success');
}

function validateLogin(email, password) {
	clearErrors();
	let isValid = true;
	if (!email || !isValidEmail(email)) {
		showFieldError('email', 'Vui lòng nhập email hợp lệ');
		isValid = false;
	}
	if (!password || String(password).length < 6) {
		showFieldError('password', 'Mật khẩu phải có ít nhất 6 ký tự');
		isValid = false;
	}
	if (!isValid) {
		const section = document.getElementById('login-form');
		if (section) {
			section.classList.add('shake');
			setTimeout(() => section.classList.remove('shake'), 500);
		}
	}
	return isValid;
}

function showForgotPassword() {
	const email = prompt('Nhập email của bạn để nhận link đặt lại mật khẩu:');
	if (!email) return;
	if (isValidEmail(email)) {
		alert('Link đặt lại mật khẩu đã được gửi đến email của bạn!');
	} else {
		alert('Email không hợp lệ!');
	}
}

// Expose helpers used by inline HTML attributes
window.showForgotPassword = showForgotPassword;

// Login handler
async function handleLogin(event) {
	event.preventDefault();
	const form = event.target;
	const formData = new FormData(form);
	const email = formData.get('email');
	const password = formData.get('password');

	if (!validateLogin(email, password)) return;

	const submitBtn = form.querySelector('button[type="submit"]');
	if (submitBtn) submitBtn.classList.add('loading');

	try {
		await signInWithEmailAndPassword(auth, email, password);
		localStorage.setItem('isLoggedIn', 'true');
		localStorage.setItem('userEmail', email);
		localStorage.setItem('loginTime', new Date().toISOString());
		showSuccess('Đăng nhập thành công! Đang chuyển hướng...');
		setTimeout(() => { window.location.href = 'index.html'; }, 1500);
	} catch (error) {
		let errorMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.';
		if (error && (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found')) {
			errorMessage = 'Email hoặc mật khẩu không chính xác';
		}
		showError(errorMessage);
		if (submitBtn) submitBtn.classList.remove('loading');
	}
}

// Expose for inline onsubmit="handleLogin(event)"
window.handleLogin = handleLogin;

// Realtime validation setup
document.addEventListener('DOMContentLoaded', () => {
	document.querySelectorAll('input[type="email"]').forEach(field => {
		field.addEventListener('blur', function () {
			if (this.value && !isValidEmail(this.value)) this.classList.add('error');
			else this.classList.remove('error');
		});
	});

	document.querySelectorAll('.form-input, .form-select').forEach(field => {
		field.addEventListener('input', function () {
			if (this.classList.contains('error')) {
				this.classList.remove('error');
				const errorMsg = this.parentNode.querySelector('.error-message');
				if (errorMsg) errorMsg.remove();
			}
		});
	});
});

