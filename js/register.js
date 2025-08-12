 // Show toast notification
        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            const icon = type === 'success' ? 'check_circle' : 'error';
            toast.innerHTML = `
                <span class="success-checkmark">
                    <span class="material-symbols-outlined">${icon}</span>
                </span>
                ${message}
            `;
            
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 100);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    
      // Import the functions you need from the SDKs you need
      import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
      import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
      import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

      // Your web app's Firebase configuration
      const firebaseConfig = {
        apiKey: "AIzaSyCddND9ciUpeL3xTpWTUMyQ0TG9FyUCdiU",
        authDomain: "gen-lang-client-0595612537.firebaseapp.com",
        projectId: "gen-lang-client-0595612537",
        storageBucket: "gen-lang-client-0595612537.firebasestorage.app",
        messagingSenderId: "1022447215307",
        appId: "1:1022447215307:web:5fbf39694b90d420d2314e"
      };

      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      // Handle signup form submission
      document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const submitBtn = e.target.querySelector('button[type="submit"]');

        const email = formData.get('email');
        const password = formData.get('password');
        const userData = {
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          fullName: `${formData.get('firstName')} ${formData.get('lastName')}`,
          email: email,
          createdAt: new Date()
        };

        submitBtn.classList.add('loading');

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          // Save user data to Firestore
          await setDoc(doc(db, 'users', user.uid), userData);
          showToast('Đăng ký thành công! Đang chuyển đến trang đăng nhập...', 'success');
          // Reset form
          document.getElementById('signupForm').reset();
          submitBtn.classList.remove('loading');
          // Redirect to login page after successful registration
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1500);
        } catch (error) {
          submitBtn.classList.remove('loading');
          let errorMessage = 'Đã xảy ra lỗi khi đăng ký';
          if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email này đã được sử dụng';
          } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email không hợp lệ';
          }
          showToast(errorMessage, 'error');
        }
      });