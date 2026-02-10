(function () {
  'use strict';

  var header = document.getElementById('header');
  var nav = document.querySelector('.nav');
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelectorAll('.nav a');
  var yearEl = document.getElementById('year');
  var themeToggle = document.getElementById('theme-toggle');
  var html = document.documentElement;

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Theme: init from localStorage or prefers-color-scheme
  function getPreferredTheme() {
    var stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }
  function applyTheme(theme) {
    html.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    if (themeToggle) themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  applyTheme(getPreferredTheme());
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      applyTheme(next);
    });
  }

  // Scroll animations: reveal sections when they enter view
  var animatedSections = document.querySelectorAll('.section.animate-in');
  if (animatedSections.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });
    animatedSections.forEach(function (el) { observer.observe(el); });
  } else {
    animatedSections.forEach(function (el) { el.classList.add('is-visible'); });
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !expanded);
      nav.classList.toggle('is-open', !expanded);
      document.body.style.overflow = expanded ? '' : 'hidden';
    });

    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });
  }

  window.addEventListener('scroll', function () {
    if (!header) return;
    if (window.scrollY > 60) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  });

  // Contact form: show success message after Formspree redirect
  var formSuccess = document.getElementById('form-success');
  var contactForm = document.getElementById('contact-form');
  if (formSuccess && contactForm) {
    var showSuccess = window.location.search.indexOf('sent=1') !== -1 ||
      window.location.hash.indexOf('sent=1') !== -1;
    if (showSuccess) {
      formSuccess.hidden = false;
      contactForm.style.display = 'none';
      var formCard = contactForm.closest('.contact-form-card');
      if (formCard) formCard.style.display = 'none';
      formSuccess.focus({ focusVisible: true });
    }
  }
})();
