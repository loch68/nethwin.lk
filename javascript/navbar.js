// Modern Navbar JavaScript - Shared across all pages
document.addEventListener('DOMContentLoaded', () => {
  const mobileToggle = document.getElementById('mobileToggle') || document.getElementById('mobileMenuBtn');
  const navbarLinks = document.getElementById('navbarLinks');
  const mobileNav = document.getElementById('mobileNav');
  const navbar = document.querySelector('.modern-navbar');
  
  // Mobile menu toggle
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      if (navbarLinks) {
        navbarLinks.classList.toggle('active');
      }
      if (mobileNav) {
        mobileNav.classList.toggle('active');
      }
      mobileToggle.classList.toggle('active');
    });
  }
  
  // Show/hide mobile auth icons based on screen size
  function updateMobileAuthVisibility() {
    const mobileAuthIcons = document.querySelector('.mobile-auth-icons');
    if (mobileAuthIcons) {
      if (window.innerWidth <= 768) {
        mobileAuthIcons.classList.remove('hidden');
        mobileAuthIcons.classList.add('flex');
      } else {
        mobileAuthIcons.classList.add('hidden');
        mobileAuthIcons.classList.remove('flex');
      }
    }
  }
  
  // Initial check and resize listener
  updateMobileAuthVisibility();
  window.addEventListener('resize', updateMobileAuthVisibility);
  
  // Navbar scroll effect (only add scrolled class, no hiding)
  if (navbar) {
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 100) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }
  
  // Auth system
  try {
    const token = localStorage.getItem('authToken');
    const navbarAuth = document.getElementById('navbarAuth');
    
    if (token && navbarAuth) {
      const loginBtn = navbarAuth.querySelector('a[href="login.html"]');
      if (loginBtn) {
        loginBtn.innerHTML = `
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
          Profile
        `;
        loginBtn.href = 'profile.html';
      }
    }
  } catch (error) {
    console.warn('Auth system initialization failed:', error);
  }
  
  // Set active navigation link based on current page
  function setActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      const linkHref = link.getAttribute('href');
      
      if (linkHref === currentPage || 
          (currentPage === '' && linkHref === 'index.html') ||
          (currentPage === 'index.html' && linkHref === 'index.html')) {
        link.classList.add('active');
      }
    });
  }
  
  // Make setActiveNavLink globally accessible
  window.setActiveNavLink = setActiveNavLink;
  
  // Set active link on page load
  setActiveNavLink();
  
  // Close mobile menu when clicking outside
  document.addEventListener('click', (e) => {
    if (mobileToggle) {
      const isClickInsideNav = navbar.contains(e.target);
      
      if (!isClickInsideNav) {
        if (navbarLinks && navbarLinks.classList.contains('active')) {
          navbarLinks.classList.remove('active');
        }
        if (mobileNav && mobileNav.classList.contains('active')) {
          mobileNav.classList.remove('active');
        }
        mobileToggle.classList.remove('active');
      }
    }
  });
  
  // Close mobile menu when clicking on a nav link
  const navLinksElements = document.querySelectorAll('.nav-link, .mobile-nav-link');
  navLinksElements.forEach(link => {
    link.addEventListener('click', () => {
      if (mobileToggle) {
        if (navbarLinks) {
          navbarLinks.classList.remove('active');
        }
        if (mobileNav) {
          mobileNav.classList.remove('active');
        }
        mobileToggle.classList.remove('active');
      }
    });
  });
  
  // Smooth scroll for anchor links
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        e.preventDefault();
        const navbarHeight = navbar ? navbar.offsetHeight : 0;
        const targetPosition = targetElement.offsetTop - navbarHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
});
