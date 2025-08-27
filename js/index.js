// Enhanced Authentication System for GitHub Pages
        class AuthSystem {
            constructor() {
                this.isLoggedIn = false;
                this.userEmail = '';
                this.loginModal = document.getElementById('loginModal');
                this.closeModalBtn = document.getElementById('closeLoginModal');
                this.sessionKey = 'tf_session_' + Date.now();
                this.init();
            }

            init() {
                // Check multiple sources for login status
                this.isLoggedIn = this.checkLoginStatus();
                
                // Setup UI based on login status
                this.setupUI();
                
                // Setup event listeners
                this.setupEventListeners();
                
                // Setup URL parameter checking (for GitHub Pages)
                this.checkURLParams();
                
                // Show welcome message if just logged in
                if (this.isLoggedIn) {
                    this.showWelcomeMessage();
                }

                // Setup demo login for testing
                this.setupDemoLogin();
            }

            checkURLParams() {
                // Check for login success from URL parameters (GitHub Pages friendly)
                const urlParams = new URLSearchParams(window.location.search);
                const loginSuccess = urlParams.get('login');
                const userEmail = urlParams.get('email') || urlParams.get('user');
                
                if (loginSuccess === 'success' && userEmail) {
                    this.performLogin(decodeURIComponent(userEmail));
                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return;
                }

                // Check for demo mode
                const demoMode = urlParams.get('demo');
                if (demoMode === 'true') {
                    this.performLogin('demo.user@techfuture.ai');
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }

            checkLoginStatus() {
                // Check multiple storage methods for compatibility
                const sources = [
                    localStorage.getItem('isLoggedIn'),
                    sessionStorage.getItem('isLoggedIn'),
                    this.getCookie('isLoggedIn')
                ];

                const emailSources = [
                    localStorage.getItem('userEmail'),
                    sessionStorage.getItem('userEmail'),
                    this.getCookie('userEmail')
                ];

                const timeSources = [
                    localStorage.getItem('loginTime'),
                    sessionStorage.getItem('loginTime'),
                    this.getCookie('loginTime')
                ];

                for (let i = 0; i < sources.length; i++) {
                    const loginStatus = sources[i];
                    const userEmail = emailSources[i];
                    const loginTime = timeSources[i];

                    if (loginStatus === 'true' && loginTime) {
                        // Check if login is still valid (24 hours)
                        const loginDate = new Date(loginTime);
                        const now = new Date();
                        const hoursDiff = (now - loginDate) / (1000 * 60 * 60);
                        
                        if (hoursDiff < 24) {
                            this.userEmail = userEmail || '';
                            return true;
                        }
                    }
                }
                
                return false;
            }

            performLogin(email = 'demo@techfuture.ai') {
                // Clean and validate email
                const cleanEmail = email.trim();
                if (!cleanEmail) {
                    console.warn('❌ Không có email để đăng nhập');
                    return;
                }

                // Validate email format (allow demo emails)
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(cleanEmail) && !cleanEmail.includes('demo')) {
                    console.warn('❌ Email không hợp lệ:', cleanEmail);
                    // Show error message to user
                    this.showErrorMessage('Email không hợp lệ!');
                    return;
                }

                this.isLoggedIn = true;
                this.userEmail = cleanEmail;
                
                const loginData = {
                    isLoggedIn: 'true',
                    userEmail: cleanEmail,
                    loginTime: new Date().toISOString(),
                    sessionId: this.sessionKey || 'session_' + Date.now()
                };

                // Store in multiple places for reliability
                try {
                    Object.entries(loginData).forEach(([key, value]) => {
                        localStorage.setItem(key, value);
                        sessionStorage.setItem(key, value);
                        this.setCookie(key, value, 1); // 1 day
                    });
                    console.log('✅ Lưu trữ đăng nhập thành công');
                } catch (e) {
                    console.warn('⚠️ Lưu trữ không khả dụng:', e);
                    // Still allow login even if storage fails
                }

                this.setupUI();
                this.showWelcomeMessage();
                
                // Log success
                console.log('🎉 Đăng nhập thành công:', cleanEmail);
            }

            showErrorMessage(message) {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(45deg, #ff6b6b, #ff8787);
                    color: white;
                    padding: 15px 25px;
                    border-radius: 12px;
                    box-shadow: 0 8px 25px rgba(255, 107, 107, 0.3);
                    z-index: 10000;
                    font-weight: 600;
                    font-size: 1rem;
                    animation: slideInFromRight 0.5s ease-out;
                `;
                
                errorDiv.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>
                    ${message}
                `;
                
                document.body.appendChild(errorDiv);
                
                setTimeout(() => {
                    errorDiv.style.animation = 'slideOutToRight 0.5s ease-in';
                    setTimeout(() => {
                        if (errorDiv.parentNode) {
                            errorDiv.parentNode.removeChild(errorDiv);
                        }
                    }, 500);
                }, 3000);
            }

            setupDemoLogin() {
                // Only show demo button if not logged in
                if (this.isLoggedIn) return;
                
                // Only show on GitHub Pages or localhost for testing
                const hostname = window.location.hostname;
                if (!(hostname.includes('github.io') || hostname === 'localhost' || hostname === '127.0.0.1')) {
                    return;
                }

                // Check if demo button already exists
                if (document.querySelector('.demo-login-btn')) return;

                // Add a demo login button for testing on GitHub Pages
                const demoBtn = document.createElement('button');
                demoBtn.className = 'demo-login-btn';
                demoBtn.innerHTML = '� Demo Login (GitHub Pages)';
                demoBtn.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: linear-gradient(45deg, #ff6ec4, #00d4aa, #00b4d8);
                    background-size: 200% 200%;
                    animation: gradientShift 3s ease infinite;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 30px;
                    font-weight: 700;
                    cursor: pointer;
                    z-index: 10000;
                    font-size: 0.95rem;
                    box-shadow: 0 6px 20px rgba(255, 110, 196, 0.4);
                    transition: all 0.3s ease;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                `;

                // Add hover effects
                demoBtn.onmouseover = () => {
                    demoBtn.style.transform = 'translateY(-3px) scale(1.05)';
                    demoBtn.style.boxShadow = '0 10px 30px rgba(255, 110, 196, 0.6)';
                };
                
                demoBtn.onmouseout = () => {
                    demoBtn.style.transform = 'translateY(0) scale(1)';
                    demoBtn.style.boxShadow = '0 6px 20px rgba(255, 110, 196, 0.4)';
                };
                
                demoBtn.onclick = () => {
                    // Use a more realistic demo email
                    this.performLogin('demo.user@techfuture.ai');
                    demoBtn.remove();
                    
                    // Show demo info
                    this.showDemoInfo();
                };
                
                document.body.appendChild(demoBtn);

                // Auto-hide after 10 seconds if not used
                setTimeout(() => {
                    if (demoBtn.parentNode && !this.isLoggedIn) {
                        demoBtn.style.opacity = '0.5';
                        demoBtn.style.transform = 'scale(0.9)';
                    }
                }, 10000);
            }

            showDemoInfo() {
                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    background: linear-gradient(45deg, #4ecdc4, #44a08d);
                    color: white;
                    padding: 20px 25px;
                    border-radius: 15px;
                    box-shadow: 0 8px 25px rgba(68, 160, 141, 0.3);
                    z-index: 10000;
                    font-weight: 600;
                    max-width: 350px;
                    animation: slideInFromLeft 0.5s ease-out;
                `;
                
                infoDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <i class="fas fa-info-circle" style="font-size: 1.2rem;"></i>
                        <strong>Demo Mode Activated</strong>
                    </div>
                    <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">
                        Bạn đang sử dụng tài khoản demo: <br>
                        <strong>demo.user@techfuture.ai</strong><br>
                        Tất cả tính năng đã được mở khóa!
                    </p>
                `;
                
                document.body.appendChild(infoDiv);
                
                setTimeout(() => {
                    infoDiv.style.animation = 'slideOutToLeft 0.5s ease-in';
                    setTimeout(() => {
                        if (infoDiv.parentNode) {
                            infoDiv.parentNode.removeChild(infoDiv);
                        }
                    }, 500);
                }, 5000);
            }

            setCookie(name, value, days) {
                try {
                    const expires = new Date();
                    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
                    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
                } catch (e) {
                    console.warn('Cookie setting failed:', e);
                }
            }

            getCookie(name) {
                try {
                    const nameEQ = name + "=";
                    const ca = document.cookie.split(';');
                    for (let i = 0; i < ca.length; i++) {
                        let c = ca[i];
                        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
                    }
                } catch (e) {
                    console.warn('Cookie reading failed:', e);
                }
                return null;
            }

            showWelcomeMessage() {
                // Create welcome notification
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(45deg, #00d4aa, #00b4d8);
                    color: white;
                    padding: 15px 25px;
                    border-radius: 12px;
                    box-shadow: 0 8px 25px rgba(0, 212, 170, 0.3);
                    z-index: 10000;
                    font-weight: 600;
                    font-size: 1rem;
                    animation: slideInFromRight 0.5s ease-out;
                    cursor: pointer;
                    max-width: 350px;
                `;
                
                notification.innerHTML = `
                    <i class="fas fa-check-circle" style="margin-right: 8px;"></i>
                    Đăng nhập thành công! 🎉<br>
                    <small style="font-size: 0.9rem; opacity: 0.9;">Đã mở khóa tất cả tính năng AI!</small>
                `;
                
                // Add CSS animation if not exists
                if (!document.getElementById('welcomeAnimationStyle')) {
                    const style = document.createElement('style');
                    style.id = 'welcomeAnimationStyle';
                    style.textContent = `
                        @keyframes slideInFromRight {
                            from { transform: translateX(100%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                        @keyframes slideOutToRight {
                            from { transform: translateX(0); opacity: 1; }
                            to { transform: translateX(100%); opacity: 0; }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                document.body.appendChild(notification);
                
                // Auto hide after 5 seconds
                setTimeout(() => {
                    notification.style.animation = 'slideOutToRight 0.5s ease-in';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 500);
                }, 5000);
                
                // Click to close
                notification.addEventListener('click', () => {
                    notification.style.animation = 'slideOutToRight 0.5s ease-in';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 500);
                });
            }

            setupUI() {
                if (this.isLoggedIn) {
                    this.enableProtectedElements();
                    this.showFeaturesSection();
                    this.updateLoginStatusIndicator(true);
                    this.updateAuthButton(true);
                } else {
                    this.disableProtectedElements();
                    this.hideFeaturesSection();
                    this.updateLoginStatusIndicator(false);
                    this.updateAuthButton(false);
                }
            }

            updateAuthButton(isLoggedIn) {
                const authBtn = document.getElementById('authToggleBtn');
                if (authBtn) {
                    if (isLoggedIn) {
                        authBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>Đăng xuất</span>';
                        authBtn.classList.add('logout');
                        authBtn.onclick = () => this.logout();
                    } else {
                        authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Đăng nhập</span>';
                        authBtn.classList.remove('logout');
                        authBtn.onclick = () => window.location.href = 'login.html';
                    }
                }
            }

            updateLoginStatusIndicator(isLoggedIn) {
                const indicator = document.getElementById('loginStatusIndicator');
                if (indicator) {
                    if (isLoggedIn) {
                        indicator.style.background = 'linear-gradient(45deg, #00d4aa, #00b4d8)';
                        indicator.innerHTML = '✓';
                        indicator.title = 'Đã đăng nhập thành công';
                    } else {
                        indicator.style.background = 'linear-gradient(45deg, #f56565, #ef4444)';
                        indicator.innerHTML = '🔒';
                        indicator.title = 'Chưa đăng nhập';
                    }
                }
            }

            showFeaturesSection() {
                const featuresSection = document.getElementById('features');
                if (featuresSection) {
                    featuresSection.style.display = 'grid';
                    // Add fade in animation
                    featuresSection.style.animation = 'fadeInUp 0.8s ease-out';
                }
            }

            hideFeaturesSection() {
                const featuresSection = document.getElementById('features');
                if (featuresSection) {
                    featuresSection.style.display = 'none';
                }
            }

            disableProtectedElements() {
                // Disable navbar links
                const navLinks = document.querySelectorAll('.top-nav-link');
                navLinks.forEach(link => {
                    link.classList.add('nav-disabled');
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showLoginModal();
                    });
                });

                // Disable "Khám phá tính năng" button
                const exploreBtn = document.querySelector('.cta-btn.secondary');
                if (exploreBtn) {
                    exploreBtn.classList.add('nav-disabled');
                    exploreBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showLoginModal();
                    });
                }

                // Disable feature CTA buttons
                const featureCTAs = document.querySelectorAll('.feature-cta');
                featureCTAs.forEach(cta => {
                    cta.classList.add('nav-disabled');
                    cta.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showLoginModal();
                    });
                });
            }

            enableProtectedElements() {
                // Enable navbar links
                const navLinks = document.querySelectorAll('.top-nav-link');
                navLinks.forEach(link => {
                    link.classList.remove('nav-disabled');
                    // Remove all click event listeners by cloning the element
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);
                });

                // Enable "Khám phá tính năng" button
                const exploreBtn = document.querySelector('.cta-btn.secondary');
                if (exploreBtn) {
                    exploreBtn.classList.remove('nav-disabled');
                    // Remove click listeners and restore original functionality
                    const newExploreBtn = exploreBtn.cloneNode(true);
                    exploreBtn.parentNode.replaceChild(newExploreBtn, exploreBtn);
                    this.setupExploreButton();
                }

                // Enable feature CTA buttons
                const featureCTAs = document.querySelectorAll('.feature-cta');
                featureCTAs.forEach(cta => {
                    cta.classList.remove('nav-disabled');
                    const newCTA = cta.cloneNode(true);
                    cta.parentNode.replaceChild(newCTA, cta);
                });
            }

            setupEventListeners() {
                // Close modal events
                if (this.closeModalBtn) {
                    this.closeModalBtn.addEventListener('click', () => {
                        this.hideLoginModal();
                    });
                }

                // Close modal when clicking overlay
                if (this.loginModal) {
                    const overlay = this.loginModal.querySelector('.login-modal-overlay');
                    if (overlay) {
                        overlay.addEventListener('click', () => {
                            this.hideLoginModal();
                        });
                    }
                }

                // ESC key to close modal
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.loginModal.classList.contains('show')) {
                        this.hideLoginModal();
                    }
                });

                // Listen for successful login (this would be called from login page)
                window.addEventListener('userLoggedIn', () => {
                    this.login();
                });
            }

            showLoginModal() {
                if (this.loginModal) {
                    this.loginModal.style.display = 'flex';
                    setTimeout(() => {
                        this.loginModal.classList.add('show');
                    }, 10);
                    
                    // Add shake animation
                    this.loginModal.addEventListener('animationend', () => {
                        this.loginModal.style.animation = '';
                    }, { once: true });
                }
            }

            hideLoginModal() {
                if (this.loginModal) {
                    this.loginModal.classList.remove('show');
                    setTimeout(() => {
                        this.loginModal.style.display = 'none';
                    }, 300);
                }
            }

            login() {
                this.isLoggedIn = true;
                localStorage.setItem('userLoggedIn', 'true');
                this.enableProtectedElements();
                this.hideLoginModal();
                
                // Show success message
                this.showSuccessMessage();
            }

            logout() {
                this.isLoggedIn = false;
                this.userEmail = '';
                
                // Clear from all storage methods
                const keysToRemove = ['isLoggedIn', 'userEmail', 'loginTime'];
                
                keysToRemove.forEach(key => {
                    try {
                        localStorage.removeItem(key);
                        sessionStorage.removeItem(key);
                        this.setCookie(key, '', -1); // Expire cookie
                    } catch (e) {
                        console.warn('Storage cleanup failed:', e);
                    }
                });

                // Remove legacy keys
                try {
                    localStorage.removeItem('userLoggedIn');
                } catch (e) {
                    console.warn('Legacy cleanup failed:', e);
                }
                
                this.setupUI();
                this.showLogoutMessage();
                
                // Re-add demo button
                setTimeout(() => {
                    this.setupDemoLogin();
                }, 1000);
            }

            setupUI() {
                if (this.isLoggedIn) {
                    this.enableProtectedElements();
                    this.showFeaturesSection();
                    this.updateLoginStatusIndicator(true);
                    this.updateAuthButton(true);
                    // Hide demo button if visible
                    const demoBtn = document.querySelector('button[style*="Demo Login"]');
                    if (demoBtn) demoBtn.style.display = 'none';
                } else {
                    this.disableProtectedElements();
                    this.hideFeaturesSection();
                    this.updateLoginStatusIndicator(false);
                    this.updateAuthButton(false);
                }
            }

            updateAuthButton(isLoggedIn) {
                const authBtn = document.getElementById('authToggleBtn');
                if (authBtn) {
                    if (isLoggedIn) {
                        authBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>Đăng xuất</span>';
                        authBtn.classList.add('logout');
                        authBtn.onclick = () => this.logout();
                    } else {
                        authBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i><span>Đăng nhập</span>';
                        authBtn.classList.remove('logout');
                        authBtn.onclick = () => {
                            // For GitHub Pages, use demo login instead
                            if (window.location.hostname.includes('github.io') || window.location.hostname === 'localhost') {
                                this.performLogin('github.demo@techfuture.ai');
                            } else {
                                window.location.href = 'login.html';
                            }
                        };
                    }
                }
            }

            disableProtectedElements() {
                // Disable navbar links
                const navLinks = document.querySelectorAll('.top-nav-link');
                navLinks.forEach(link => {
                    link.classList.add('nav-disabled');
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showLoginModal();
                    });
                });

                // Disable footer product links
                const footerLinks = document.querySelectorAll('.footer-links a');
                footerLinks.forEach(link => {
                    link.classList.add('nav-disabled');
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showLoginModal();
                    });
                });

                // Disable intro CTA buttons
                const introCTAs = document.querySelectorAll('.intro-btn');
                introCTAs.forEach(btn => {
                    btn.classList.add('nav-disabled');
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showLoginModal();
                    });
                });

                // Disable feature CTA buttons
                const featureCTAs = document.querySelectorAll('.feature-cta');
                featureCTAs.forEach(cta => {
                    cta.classList.add('nav-disabled');
                    cta.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.showLoginModal();
                    });
                });
            }

            enableProtectedElements() {
                // Enable navbar links
                const navLinks = document.querySelectorAll('.top-nav-link');
                navLinks.forEach(link => {
                    link.classList.remove('nav-disabled');
                    // Remove all click event listeners by cloning the element
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);
                });

                // Enable footer product links
                const footerLinks = document.querySelectorAll('.footer-links a');
                footerLinks.forEach(link => {
                    link.classList.remove('nav-disabled');
                    // Remove all click event listeners by cloning the element
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);
                });

                // Enable intro CTA buttons
                const introCTAs = document.querySelectorAll('.intro-btn');
                introCTAs.forEach(btn => {
                    btn.classList.remove('nav-disabled');
                    const newBtn = btn.cloneNode(true);
                    btn.parentNode.replaceChild(newBtn, btn);
                });

                // Enable feature CTA buttons
                const featureCTAs = document.querySelectorAll('.feature-cta');
                featureCTAs.forEach(cta => {
                    cta.classList.remove('nav-disabled');
                    const newCTA = cta.cloneNode(true);
                    cta.parentNode.replaceChild(newCTA, cta);
                });
            }

            showLogoutMessage() {
                const notification = document.createElement('div');
                notification.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(45deg, #f56565, #ef4444);
                    color: white;
                    padding: 15px 25px;
                    border-radius: 12px;
                    box-shadow: 0 8px 25px rgba(245, 101, 101, 0.3);
                    z-index: 10000;
                    font-weight: 600;
                    font-size: 1rem;
                    animation: slideInFromRight 0.5s ease-out;
                `;
                
                notification.innerHTML = `
                    <i class="fas fa-sign-out-alt" style="margin-right: 8px;"></i>
                    Đã đăng xuất thành công! 👋
                `;
                
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.style.animation = 'slideOutToRight 0.5s ease-in';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 500);
                }, 3000);
            }

            showSuccessMessage() {
                // Create and show success notification
                const notification = document.createElement('div');
                notification.innerHTML = `
                    <div style="
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: linear-gradient(45deg, #00d4aa, #00b4d8);
                        color: white;
                        padding: 15px 25px;
                        border-radius: 12px;
                        box-shadow: 0 8px 25px rgba(0, 212, 170, 0.3);
                        z-index: 10001;
                        font-weight: 600;
                        animation: slideInRight 0.5s ease;
                    ">
                        <i class="fas fa-check-circle"></i>
                        Đăng nhập thành công! Bây giờ bạn có thể truy cập tất cả tính năng.
                    </div>
                `;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }

            setupExploreButton() {
                const exploreBtn = document.querySelector('.cta-btn.secondary');
                const featuresGrid = document.getElementById('features');
                if (exploreBtn && featuresGrid) {
                    let featuresOpen = false;
                    exploreBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        featuresOpen = !featuresOpen;
                        if (featuresOpen) {
                            featuresGrid.style.display = 'grid';
                            featuresGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } else {
                            featuresGrid.style.display = 'none';
                        }
                    });
                }
            }

            showFeaturesSection() {
                const featuresSection = document.querySelector('.features-intro');
                if (featuresSection) {
                    featuresSection.style.opacity = '1';
                    featuresSection.style.pointerEvents = 'auto';
                }
            }

            hideFeaturesSection() {
                const featuresSection = document.querySelector('.features-intro');
                if (featuresSection) {
                    featuresSection.style.opacity = '0.5';
                    featuresSection.style.pointerEvents = 'none';
                }
            }

            updateLoginStatusIndicator(isLoggedIn) {
                const indicator = document.getElementById('loginStatusIndicator');
                const footerStatus = document.getElementById('loginStatusFooter');
                
                if (indicator) {
                    if (isLoggedIn) {
                        indicator.innerHTML = `<i class="fas fa-unlock" style="color: #4CAF50;"></i> Đã đăng nhập thành công`;
                        indicator.style.color = '#4CAF50';
                    } else {
                        indicator.innerHTML = '<i class="fas fa-lock" style="color: #f44336;"></i> Cần đăng nhập để sử dụng tính năng';
                        indicator.style.color = '#f44336';
                    }
                }

                // Update footer status
                if (footerStatus) {
                    if (isLoggedIn) {
                        footerStatus.innerHTML = `
                            <i class="fas fa-unlock" style="color: #4CAF50;"></i>
                            <span style="color: #4CAF50;">Đã đăng nhập thành công</span>
                        `;
                    } else {
                        footerStatus.innerHTML = `
                            <i class="fas fa-lock" style="color: #f44336;"></i>
                            <span style="color: #f44336;">Chưa đăng nhập</span>
                        `;
                    }
                }
            }

            showLoginModal() {
                // Create login prompt modal
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.8); display: flex; align-items: center;
                    justify-content: center; z-index: 10000;
                `;
                
                modal.innerHTML = `
                    <div style="background: white; padding: 30px; border-radius: 15px; text-align: center; max-width: 400px; margin: 20px;">
                        <i class="fas fa-lock" style="font-size: 48px; color: #f44336; margin-bottom: 20px;"></i>
                        <h3 style="margin: 0 0 15px 0; color: #333;">Cần đăng nhập</h3>
                        <p style="margin: 0 0 25px 0; color: #666;">Vui lòng đăng nhập để truy cập tính năng này.</p>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" 
                                style="padding: 10px 20px; background: #ddd; border: none; border-radius: 5px; cursor: pointer;">
                                Hủy
                            </button>
                            <button onclick="window.location.href='login.html'" 
                                style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                                Đăng nhập
                            </button>
                        </div>
                    </div>
                `;


                document.body.appendChild(modal);
                
                // Auto close after 5 seconds
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.remove();
                    }
                }, 5000);
            }

            setupDemoLogin() {
                // Only add demo button if not logged in and on GitHub Pages or localhost
                if (this.isLoggedIn) return;
                if (!(window.location.hostname.includes('github.io') || window.location.hostname === 'localhost')) return;
                
                // Check if demo button already exists
                if (document.querySelector('button[style*="Demo Login"]')) return;
                
                const demoBtn = document.createElement('button');
                demoBtn.innerHTML = '🚀 Demo Login (GitHub Pages)';
                demoBtn.style.cssText = `
                    position: fixed; bottom: 20px; right: 20px; z-index: 1000;
                    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                    color: white; border: none; padding: 12px 20px;
                    border-radius: 25px; cursor: pointer; font-weight: bold;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    transition: transform 0.3s ease;
                `;
                
                demoBtn.onmouseover = () => demoBtn.style.transform = 'scale(1.05)';
                demoBtn.onmouseout = () => demoBtn.style.transform = 'scale(1)';
                demoBtn.onclick = () => {
                    this.performLogin('github.demo@techfuture.ai');
                    demoBtn.remove();
                };
                
                document.body.appendChild(demoBtn);
            }
        }



        // Initialize auth system
        const authSystem = new AuthSystem();

        // Check URL parameters on page load
        window.addEventListener('load', () => {
            authSystem.checkUrlParams();
        });

        // Message from login page
        window.addEventListener('message', (event) => {
            if (event.data.type === 'LOGIN_SUCCESS' && event.data.email) {
                authSystem.performLogin(event.data.email);
            }
        });

        // Add CSS for success animation
        const successStyle = document.createElement('style');
        successStyle.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(successStyle);

        // Navbar scroll effect
        window.addEventListener('scroll', function() {
            const navbar = document.querySelector('.top-navbar');
            if (window.scrollY > 30) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        // Auth buttons special effects
        document.querySelectorAll('.nav-auth-btn').forEach(button => {
            // Add pulsing effect to login button
            if (button.classList.contains('login')) {
                setInterval(() => {
                    button.style.boxShadow = '0 4px 20px rgba(0, 212, 170, 0.6)';
                    setTimeout(() => {
                        button.style.boxShadow = '0 4px 15px rgba(0, 212, 170, 0.3)';
                    }, 1000);
                }, 3000);
            }

            // Add click ripple effect
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    transform: scale(0);    
                    animation: authRipple 0.6s linear;
                    pointer-events: none;
                `;
                
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });

            // Add hover particle effect
            button.addEventListener('mouseenter', function() {
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        const particle = document.createElement('div');
                        particle.style.cssText = `
                            position: absolute;
                            width: 4px;
                            height: 4px;
                            background: #00d4aa;
                            border-radius: 50%;
                            left: ${Math.random() * 100}%;
                            top: 50%;
                            transform: translateY(-50%);
                            animation: authParticle 1s ease-out forwards;
                            pointer-events: none;
                        `;
                        this.appendChild(particle);
                        
                        setTimeout(() => {
                            if (particle.parentNode) {
                                particle.remove();
                            }
                        }, 1000);
                    }, i * 100);
                }
            });
        });

        // Social links special effects
        document.querySelectorAll('.nav-social-link').forEach((link, index) => {
            // Add staggered entrance animation
            link.style.opacity = '0';
            link.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                link.style.transition = 'all 0.5s ease';
                link.style.opacity = '1';
                link.style.transform = 'translateY(0)';
            }, 200 * (index + 1));

            // Add special hover effects
            link.addEventListener('mouseenter', function() {
                this.style.animation = 'socialPulse 1s ease-in-out infinite';
                
                // Create sparkle effect
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        const sparkle = document.createElement('div');
                        sparkle.style.cssText = `
                            position: absolute;
                            width: 3px;
                            height: 3px;
                            background: currentColor;
                            border-radius: 50%;
                            left: ${Math.random() * 100}%;
                            top: ${Math.random() * 100}%;
                            animation: sparkleEffect 1s ease-out forwards;
                            pointer-events: none;
                            z-index: 10;
                        `;
                        this.appendChild(sparkle);
                        
                        setTimeout(() => sparkle.remove(), 1000);
                    }, i * 150);
                }
            });

            link.addEventListener('mouseleave', function() {
                this.style.animation = '';
            });

            // Add click feedback
            link.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    transform: scale(0);
                    pointer-events: none;
                `;
                
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 800);
            });
        });

        // Image Modal Functions
        let currentZoom = 1;
        let isDragging = false;
        let startX, startY, translateX = 0, translateY = 0;

        function openImageModal(imageSrc, imageTitle, imageDesc) {
            const modal = document.getElementById('imageModal');
            const modalImg = document.getElementById('imageModalImg');
            const modalTitle = document.getElementById('imageModalTitle');
            const modalDesc = document.getElementById('imageModalDesc');
            const downloadBtn = document.getElementById('imageDownloadBtn');
            
            // Reset zoom and position - start with fit-to-screen zoom
            currentZoom = 0.8;
            translateX = 0;
            translateY = 0;
            
            modalImg.src = imageSrc;
            modalImg.alt = imageTitle;
            modalTitle.textContent = imageTitle;
            modalDesc.textContent = imageDesc;
            
            // Setup download functionality
            downloadBtn.onclick = () => downloadImage(imageSrc, imageTitle);
            
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            // Initialize zoom and drag functionality
            initializeImageInteractions(modalImg);
            
            // Apply initial zoom to fit screen
            setTimeout(() => {
                updateImageTransform();
            }, 100);
            
            // Add escape key listener
            document.addEventListener('keydown', handleImageModalEscape);
        }

        function initializeImageInteractions(img) {
            const zoomInBtn = document.getElementById('zoomInBtn');
            const zoomOutBtn = document.getElementById('zoomOutBtn');
            const resetZoomBtn = document.getElementById('resetZoomBtn');
            
            // Zoom controls
            zoomInBtn.onclick = () => zoomImage(1.2);
            zoomOutBtn.onclick = () => zoomImage(0.8);
            resetZoomBtn.onclick = () => resetZoom();
            
            // Mouse wheel zoom
            img.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                zoomImage(zoomFactor, e.clientX, e.clientY);
            });
            
            // Touch/Mouse drag functionality
            img.addEventListener('mousedown', startDrag);
            img.addEventListener('touchstart', startDrag);
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag);
            
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchend', endDrag);
        }

        function zoomImage(factor, centerX, centerY) {
            const img = document.getElementById('imageModalImg');
            const newZoom = Math.max(0.5, Math.min(currentZoom * factor, 5));
            
            if (centerX && centerY) {
                const rect = img.getBoundingClientRect();
                const offsetX = centerX - rect.left - rect.width / 2;
                const offsetY = centerY - rect.top - rect.height / 2;
                
                translateX -= offsetX * (factor - 1);
                translateY -= offsetY * (factor - 1);
            }
            
            currentZoom = newZoom;
            updateImageTransform();
            
            if (currentZoom > 0.8) {
                img.classList.add('zoomed');
            } else {
                img.classList.remove('zoomed');
            }
        }

        function resetZoom() {
            currentZoom = 0.8;
            translateX = 0;
            translateY = 0;
            updateImageTransform();
            document.getElementById('imageModalImg').classList.remove('zoomed');
        }

        function updateImageTransform() {
            const img = document.getElementById('imageModalImg');
            img.style.transform = `scale(${currentZoom}) translate(${translateX}px, ${translateY}px)`;
        }

        function startDrag(e) {
            if (currentZoom <= 0.8) return;
            
            isDragging = true;
            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            
            startX = clientX - translateX;
            startY = clientY - translateY;
            
            e.preventDefault();
        }

        function drag(e) {
            if (!isDragging || currentZoom <= 0.8) return;
            
            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            
            translateX = clientX - startX;
            translateY = clientY - startY;
            
            updateImageTransform();
            e.preventDefault();
        }

        function endDrag() {
            isDragging = false;
        }

        function closeImageModal() {
            const modal = document.getElementById('imageModal');
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
            
            // Reset zoom and position
            resetZoom();
            
            // Remove escape key listener
            document.removeEventListener('keydown', handleImageModalEscape);
        }

        function handleImageModalEscape(e) {
            if (e.key === 'Escape') {
                closeImageModal();
            }
        }

        function downloadImage(imageSrc, imageName) {
            // Create a temporary link element
            const link = document.createElement('a');
            link.href = imageSrc;
            link.download = imageName + '.jpg'; // Default to jpg extension
            
            // Append to body, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Show download notification
            showDownloadNotification(imageName);
        }

        function showDownloadNotification(imageName) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(45deg, #00d4aa, #00b4d8);
                color: white;
                padding: 15px 25px;
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(0, 212, 170, 0.3);
                z-index: 10001;
                font-weight: 600;
                font-size: 1rem;
                animation: slideInFromRight 0.5s ease-out;
                max-width: 350px;
            `;
            
            notification.innerHTML = `
                <i class="fas fa-download" style="margin-right: 8px;"></i>
                Đã tải xuống: ${imageName}
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOutToRight 0.5s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }, 3000);
        }

        // Setup image modal event listeners
        document.addEventListener('DOMContentLoaded', function() {
            const closeBtn = document.getElementById('closeImageModal');
            const modal = document.getElementById('imageModal');
            
            // Close button click
            if (closeBtn) {
                closeBtn.addEventListener('click', closeImageModal);
            }
            
            // Click outside modal to close
            if (modal) {
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        closeImageModal();
                    }
                });
            }
        });

        // Create Particles
        function createParticles() {
            const particles = document.getElementById('particles');
            const particleCount = 30;
            
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.width = Math.random() * 6 + 2 + 'px';
                particle.style.height = particle.style.width;
                particle.style.animationDelay = Math.random() * 8 + 's';
                particle.style.animationDuration = (Math.random() * 10 + 8) + 's';
                particles.appendChild(particle);
            }
        }

        // Create Floating Shapes (Simple Background Elements)
        function createFloatingShapes() {
            const container = document.getElementById('floatingShapes');
            
            setInterval(() => {
                const shape = document.createElement('div');
                shape.className = 'floating-shape';
                
                const size = Math.random() * 100 + 50;
                shape.style.width = size + 'px';
                shape.style.height = size + 'px';
                shape.style.left = Math.random() * 100 + '%';
                shape.style.animationDuration = (Math.random() * 10 + 15) + 's';
                
                container.appendChild(shape);
                
                // Remove shape after animation
                setTimeout(() => {
                    if (shape.parentNode) {
                        shape.parentNode.removeChild(shape);
                    }
                }, 25000);
            }, 3000);
        }

        // Create Floating Icons (both Font Awesome and Custom Images)
        function createFloatingIcons() {
            const container = document.getElementById('floatingIcons');
            if (!container) {
                console.warn('FloatingIcons container not found');
                return;
            }
            
            // Tech-related Font Awesome icons
            const techIcons = [
                'fas fa-robot',           // AI/Robot
                'fas fa-brain',           // Intelligence
                'fas fa-microchip',       // Technology
                'fas fa-code',            // Programming
                'fas fa-laptop-code',     // Development
                'fas fa-database',        // Data
                'fas fa-cloud',           // Cloud
                'fas fa-network-wired',   // Network
                'fas fa-cogs',            // Settings/Automation
                'fas fa-rocket',          // Innovation
                'fas fa-chart-line',      // Analytics
                'fas fa-file-code',       // Files
                'fas fa-user-tie',        // Professional
                'fas fa-graduation-cap',  // Education
                'fas fa-lightbulb',       // Ideas
                'fas fa-search',          // Search/Analysis
                'fas fa-shield-alt',      // Security
                'fas fa-globe',           // Global
                'fas fa-mobile-alt',      // Mobile
                'fas fa-desktop'          // Desktop
            ];

            // Your custom icon images
            const customIcons = [
                './ảnh/Logo2.jpg',
                './ảnh/hackathon 2024.jpg',
                './ảnh/kinh doanh 2024.jpg',
                './ảnh/top cv 2.jpg'
            ];

            // Test function to check if images exist
            function testImageLoad(src) {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve(true);
                    img.onerror = () => {
                        console.warn('Image not found:', src);
                        resolve(false);
                    };
                    img.src = src;
                });
            }

            function createIcon() {
                // Random choice between Font Awesome icon or custom image
                const useCustomIcon = Math.random() < 0.25; // 25% chance for custom icons
                
                if (useCustomIcon) {
                    // Create custom image icon
                    const iconWrapper = document.createElement('div');
                    iconWrapper.className = 'floating-icon image-icon';
                    
                    const img = document.createElement('img');
                    const randomIcon = customIcons[Math.floor(Math.random() * customIcons.length)];
                    
                    // First test if image loads
                    testImageLoad(randomIcon).then(canLoad => {
                        if (canLoad) {
                            img.src = randomIcon;
                            img.alt = 'Custom Icon';
                            img.style.cssText = `
                                width: 40px;
                                height: 40px;
                                border-radius: 50%;
                                object-fit: cover;
                                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                                transition: all 0.3s ease;
                                display: block;
                            `;
                            
                            iconWrapper.appendChild(img);
                            
                            // Random positioning and animation
                            iconWrapper.style.cssText = `
                                position: absolute;
                                left: ${Math.random() * 100}%;
                                top: 100vh;
                                z-index: 1;
                                opacity: 0.8;
                                animation: floatUpSmooth ${(Math.random() * 10 + 15)}s linear infinite;
                                animation-delay: ${Math.random() * 5}s;
                                transform: translateX(-50%);
                            `;
                            
                            container.appendChild(iconWrapper);
                            console.log('Added image icon:', randomIcon);
                            
                            // Remove icon after animation
                            setTimeout(() => {
                                if (iconWrapper.parentNode) {
                                    iconWrapper.parentNode.removeChild(iconWrapper);
                                }
                            }, 25000);
                        } else {
                            // If image fails, create a Font Awesome icon instead
                            createFontAwesomeIcon();
                        }
                    });
                } else {
                    createFontAwesomeIcon();
                }
            }

            function createFontAwesomeIcon() {
                // Create Font Awesome icon
                const icon = document.createElement('i');
                const randomIcon = techIcons[Math.floor(Math.random() * techIcons.length)];
                icon.className = `${randomIcon} floating-icon`;
                
                // Random positioning and smooth animation
                icon.style.cssText = `
                    position: absolute;
                    left: ${Math.random() * 100}%;
                    top: 100vh;
                    font-size: ${(Math.random() * 1.5 + 1.2)}rem;
                    color: rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6);
                    z-index: 1;
                    animation: floatUpSmooth ${(Math.random() * 12 + 18)}s linear infinite;
                    animation-delay: ${Math.random() * 3}s;
                    transform: translateX(-50%);
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                    transition: all 0.3s ease;
                `;
                
                // Add hover effect
                icon.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateX(-50%) scale(1.3) rotate(15deg)';
                    this.style.textShadow = '0 4px 20px rgba(0, 212, 170, 0.8)';
                });
                
                icon.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateX(-50%) scale(1) rotate(0deg)';
                    this.style.textShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
                });
                
                container.appendChild(icon);
                
                // Remove icon after animation
                setTimeout(() => {
                    if (icon.parentNode) {
                        icon.parentNode.removeChild(icon);
                    }
                }, 30000);
            }

            // Create icons at intervals
            setInterval(createIcon, 2500);
            
            // Initial icons
            for (let i = 0; i < 5; i++) {
                setTimeout(createIcon, i * 800);
            }
            
            // Debug: Test if images are accessible
            console.log('Testing custom icons...');
            customIcons.forEach(icon => {
                testImageLoad(icon).then(canLoad => {
                    console.log(`${icon}: ${canLoad ? 'OK' : 'FAILED'}`);
                });
            });
        }

        // Enhanced Floating CV/Career Icons
        function createCareerIcons() {
            const container = document.getElementById('floatingIcons');
            
            const careerIcons = [
                { icon: 'fas fa-file-alt', color: 'rgba(0, 212, 170, 0.7)' },        // CV
                { icon: 'fas fa-briefcase', color: 'rgba(0, 180, 216, 0.7)' },       // Career
                { icon: 'fas fa-user-circle', color: 'rgba(255, 110, 196, 0.6)' },   // Profile
                { icon: 'fas fa-handshake', color: 'rgba(120, 115, 245, 0.6)' },     // Interview
                { icon: 'fas fa-trophy', color: 'rgba(251, 191, 36, 0.7)' },         // Achievement
                { icon: 'fas fa-star', color: 'rgba(245, 101, 101, 0.6)' },          // Rating
                { icon: 'fas fa-target', color: 'rgba(16, 185, 129, 0.7)' },         // Goals
                { icon: 'fas fa-puzzle-piece', color: 'rgba(139, 92, 246, 0.6)' }    // Skills
            ];

            function createCareerIcon() {
                const iconData = careerIcons[Math.floor(Math.random() * careerIcons.length)];
                const icon = document.createElement('i');
                icon.className = `${iconData.icon} floating-icon career-icon`;
                icon.style.color = iconData.color;
                icon.style.left = Math.random() * 100 + '%';
                icon.style.fontSize = (Math.random() * 1.8 + 1.2) + 'rem';
                icon.style.animationDelay = Math.random() * 3 + 's';
                icon.style.animationDuration = (Math.random() * 8 + 12) + 's';
                
                // Add glow effect
                icon.style.textShadow = `0 0 10px ${iconData.color}, 0 0 20px ${iconData.color}`;
                
                container.appendChild(icon);
                
                setTimeout(() => {
                    if (icon.parentNode) {
                        icon.parentNode.removeChild(icon);
                    }
                }, 20000);
            }

            // Create career icons less frequently but with more impact
            setInterval(createCareerIcon, 3500);
            
            // Initial career icons
            setTimeout(createCareerIcon, 500);
            setTimeout(createCareerIcon, 2000);
        }

        // Features functionality is now handled by AuthSystem
        // Setup initial explore button for logged-in users
        if (authSystem.isLoggedIn) {
            authSystem.setupExploreButton();
        }

        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observe feature cards
        document.querySelectorAll('.feature-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });

        // Dynamic cursor effect
        document.addEventListener('mousemove', (e) => {
            const cursor = document.querySelector('.cursor');
            if (!cursor) {
                const newCursor = document.createElement('div');
                newCursor.className = 'cursor';
                newCursor.style.cssText = `
                    position: fixed;
                    width: 20px;
                    height: 20px;
                    background: radial-gradient(circle, rgba(0, 212, 170, 0.8), transparent);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 9999;
                    transition: transform 0.1s ease;
                `;
                document.body.appendChild(newCursor);
            }
            
            const actualCursor = document.querySelector('.cursor');
            if (actualCursor) {
                actualCursor.style.left = e.clientX - 10 + 'px';
                actualCursor.style.top = e.clientY - 10 + 'px';
            }
        });

        // Initialize animations
        document.addEventListener('DOMContentLoaded', () => {
            createParticles();
            createFloatingShapes();
            createFloatingIcons();
            createCareerIcons();
            
            // Add loading animation
            document.body.style.opacity = '0';
            setTimeout(() => {
                document.body.style.transition = 'opacity 0.5s ease';
                document.body.style.opacity = '1';
            }, 100);
        });



        // Add ripple effect to buttons
        document.querySelectorAll('.cta-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    background: rgba(255, 255, 255, 0.5);
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                `;
                
                this.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });

        // Add ripple animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            @keyframes authRipple {
                to {
                    transform: scale(3);
                    opacity: 0;
                }
            }
            
            @keyframes floatUpSmooth {
                0% {
                    transform: translateX(-50%) translateY(0) rotate(0deg) scale(0.8);
                    opacity: 0;
                }
                10% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(-10vh) rotate(45deg) scale(1);
                }
                50% {
                    transform: translateX(-50%) translateY(-50vh) rotate(180deg) scale(1.1);
                }
                90% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(-90vh) rotate(315deg) scale(0.9);
                }
                100% {
                    transform: translateX(-50%) translateY(-110vh) rotate(360deg) scale(0.5);
                    opacity: 0;
                }
            }
            
            @keyframes authParticle {
                0% {
                    opacity: 1;
                    transform: translateY(-50%) scale(1);
                }
                50% {
                    opacity: 0.7;
                    transform: translateY(-80%) scale(1.2);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-120%) scale(0.5);
                }
            }
        `;
        document.head.appendChild(style);

        // Hamburger menu for mobile
        document.addEventListener('DOMContentLoaded', function() {
            const menuBtn = document.querySelector('.top-nav-menu-btn');
            const navLinks = document.querySelector('.top-nav-links');
            const navOverlay = document.querySelector('.top-nav-overlay');
            const bars = menuBtn ? menuBtn.querySelectorAll('.menu-bar') : [];
            
            function closeMenu() {
                navLinks.classList.remove('open');
                navOverlay.classList.remove('open');
                menuBtn.setAttribute('aria-label', 'Mở menu');
                
                // Reset hamburger animation
                if (bars.length >= 3) {
                    bars[0].style.transform = 'none';
                    bars[1].style.opacity = '1';
                    bars[2].style.transform = 'none';
                }
                
                // Reset button color
                if (menuBtn) {
                    menuBtn.style.background = 'linear-gradient(135deg, rgba(0,212,170,0.2), rgba(0,180,216,0.2))';
                    menuBtn.style.borderColor = '#00d4aa';
                }
            }
            
            function openMenu() {
                navLinks.classList.add('open');
                navOverlay.classList.add('open');
                menuBtn.setAttribute('aria-label', 'Đóng menu');
                
                // Animate hamburger to X
                if (bars.length >= 3) {
                    bars[0].style.transform = 'rotate(45deg) translate(8px, 6px)';
                    bars[1].style.opacity = '0';
                    bars[2].style.transform = 'rotate(-45deg) translate(8px, -6px)';
                }
                
                // Change button color when open
                if (menuBtn) {
                    menuBtn.style.background = 'linear-gradient(135deg, rgba(245,101,101,0.3), rgba(239,68,68,0.3))';
                    menuBtn.style.borderColor = '#f56565';
                }
            }
            
            if (menuBtn && navLinks && navOverlay) {
                // Hiện nút menu trên mobile
                function checkMobileMenu() {
                    if (window.innerWidth <= 600) {
                        menuBtn.style.display = 'flex';
                        closeMenu();
                    } else {
                        menuBtn.style.display = 'none';
                        navLinks.classList.remove('open');
                        navOverlay.classList.remove('open');
                    }
                }
                
                checkMobileMenu();
                window.addEventListener('resize', checkMobileMenu);
                
                menuBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (navLinks.classList.contains('open')) {
                        closeMenu();
                    } else {
                        openMenu();
                    }
                });
                
                navOverlay.addEventListener('click', closeMenu);
                
                navLinks.querySelectorAll('.top-nav-link').forEach(link => {
                    link.addEventListener('click', closeMenu);
                });
                
                // Add keyboard support
                menuBtn.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (navLinks.classList.contains('open')) {
                            closeMenu();
                        } else {
                            openMenu();
                        }
                    }
                });
            }
        });
