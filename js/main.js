(function () {
  'use strict';

  var header = document.getElementById('header');
  var nav = document.querySelector('.nav');
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelectorAll('.nav a');
  var yearEl = document.getElementById('year');

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
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
      formSuccess.focus({ focusVisible: true });
    }
  }
})();
