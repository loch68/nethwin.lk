// Authentication Manager
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.user = null;
    this.loadUserFromStorage();
  }

  // Load user data from localStorage
  loadUserFromStorage() {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        this.user = JSON.parse(userData);
      } catch (e) {
        console.error('Error parsing user data:', e);
        this.user = null;
      }
    }
  }

  // Save user data to localStorage
  saveUserToStorage(userData) {
    this.user = userData;
    localStorage.setItem('userData', JSON.stringify(userData));
  }

  // Clear user data from localStorage
  clearUserData() {
    this.user = null;
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('adminMode');
    // Clear cart when user logs out
    localStorage.removeItem('nethwin_cart');
  }

  // Check if user is logged in
  isLoggedIn() {
    return !!(this.token && this.user);
  }

  // Check if user is admin
  isAdmin() {
    return this.user && this.user.role === 'admin';
  }

  // Get current user
  getCurrentUser() {
    return this.user;
  }

  // Sign up
  async signup(userData) {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Auto-login after successful signup
      return await this.login(userData.email, userData.password);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  // Login
  async login(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token and user data
      this.token = data.token;
      this.saveUserToStorage(data.user);
      localStorage.setItem('authToken', data.token);
      
      // Clear cart when user logs in (fresh session)
      localStorage.removeItem('nethwin_cart');

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout
  logout() {
    this.clearUserData();
    // Update cart count after clearing cart
    updateCartCountAfterAuth();
    window.location.href = 'index.html';
  }

  // Get auth headers for API requests
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }
}

// Initialize global auth manager
window.authManager = new AuthManager();

// Initialize auth system
function initializeAuth() {
  // Check if user is logged in on page load
  if (window.authManager.isLoggedIn()) {
    // User is logged in, show appropriate UI
    updateUIForLoggedInUser();
  } else {
    // User is not logged in, show login/signup UI
    updateUIForGuestUser();
  }
  
  // Update cart count after auth check
  updateCartCountAfterAuth();
}

// Update cart count after authentication changes
function updateCartCountAfterAuth() {
  // Check if updateCartCount function exists on the page
  if (typeof updateCartCount === 'function') {
    updateCartCount();
  }
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
  const user = window.authManager.getCurrentUser();
  
  // Update navigation
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === 'login.html' || link.getAttribute('href') === 'signup.html') {
      link.style.display = 'none';
    }
  });

  // Show profile/logout links
  const profileLink = document.getElementById('profileLink');
  const logoutLink = document.getElementById('logoutLink');
  
  if (profileLink) profileLink.style.display = 'block';
  if (logoutLink) logoutLink.style.display = 'block';

  // Update welcome message if exists
  const welcomeMessage = document.getElementById('welcomeMessage');
  if (welcomeMessage && user) {
    welcomeMessage.textContent = `Welcome, ${user.fullName}`;
  }
}

// Update UI for guest user
function updateUIForGuestUser() {
  // Show login/signup links
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (link.getAttribute('href') === 'login.html' || link.getAttribute('href') === 'signup.html') {
      link.style.display = 'block';
    }
  });

  // Hide profile/logout links
  const profileLink = document.getElementById('profileLink');
  const logoutLink = document.getElementById('logoutLink');
  
  if (profileLink) profileLink.style.display = 'none';
  if (logoutLink) logoutLink.style.display = 'none';
}

// Handle logout
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    window.authManager.logout();
  }
}

// Handle form submissions
document.addEventListener('DOMContentLoaded', function() {
  // Signup form
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(signupForm);
      const userData = {
        Username: formData.get('username'),
        FullName: formData.get('fullName'),
        EmailAddress: formData.get('email'),
        PhoneNumber: formData.get('phone'),
        Address: formData.get('address'),
        Province: formData.get('province'),
        District: formData.get('district'),
        City: formData.get('city'),
        ZipCode: formData.get('zipcode'),
        PasswordHash: formData.get('password')
      };

      try {
        await window.authManager.signup(userData);
        alert('Signup successful! You are now logged in.');
        
        // Update cart count after signup (cart will be cleared)
        updateCartCountAfterAuth();
        
        window.location.href = 'index.html';
      } catch (error) {
        alert('Signup failed: ' + error.message);
      }
    });
  }

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(loginForm);
      const email = formData.get('email');
      const password = formData.get('password');

      try {
        await window.authManager.login(email, password);
        alert('Login successful!');
        
        // Update cart count after login (cart will be cleared)
        updateCartCountAfterAuth();
        
        // Check if user is admin
        if (window.authManager.isAdmin()) {
          window.location.href = 'admin-dashboard.html';
        } else {
          window.location.href = 'profile.html';
        }
      } catch (error) {
        alert('Login failed: ' + error.message);
      }
    });
  }
});
