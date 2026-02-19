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

  // Department chooser: select department, scroll to form, set hidden input and optional subject (event delegation)
  var departmentChooser = document.getElementById('department-chooser');
  var contactDepartmentEl = document.getElementById('contact-department');
  var contactSubjectEl = document.getElementById('contact-subject');
  var departmentChosenEl = document.getElementById('department-chosen');
  var contactSection = document.getElementById('contact');
  if (departmentChooser && contactDepartmentEl && contactSection) {
    departmentChooser.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.department-btn');
      if (!btn) return;
      var dept = btn.getAttribute('data-department');
      var label = btn.getAttribute('data-label');
      if (!dept) return;
      contactDepartmentEl.value = dept;
      var allBtns = departmentChooser.querySelectorAll('.department-btn');
      for (var i = 0; i < allBtns.length; i++) allBtns[i].classList.remove('is-selected');
      btn.classList.add('is-selected');
      if (departmentChosenEl) {
        departmentChosenEl.hidden = false;
        departmentChosenEl.textContent = 'Sending to: ' + (label || dept) + '. Fill in the form below.';
      }
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (contactSubjectEl && !contactSubjectEl.value) {
        var placeholders = { general: 'General inquiry', sales: 'Business / sales inquiry', accounting: 'Finance / accounting inquiry' };
        contactSubjectEl.placeholder = placeholders[dept] || 'Your subject';
      }
    });
  }

  // Contact form: POST to /api/contact (Cloudflare Pages Function + Resend). Fallback to mailto if API fails.
  var formSuccess = document.getElementById('form-success');
  var formError = document.getElementById('form-error');
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var nameEl = document.getElementById('contact-name');
      var emailEl = document.getElementById('contact-email');
      var subjectEl = document.getElementById('contact-subject');
      var messageEl = document.getElementById('contact-message');
      var departmentEl = document.getElementById('contact-department');
      if (!nameEl || !emailEl || !subjectEl || !messageEl) return;
      var name = (nameEl.value || '').trim();
      var email = (emailEl.value || '').trim();
      var subject = (subjectEl.value || '').trim();
      var message = (messageEl.value || '').trim();
      var department = (departmentEl && departmentEl.value) ? departmentEl.value.trim() : '';
      if (!name || !email || !subject || !message) return;

      if (formError) {
        formError.hidden = true;
        formError.textContent = '';
      }
      var submitBtn = contactForm.querySelector('button[type="submit"]');
      var btnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      var payload = { name: name, email: email, subject: subject, message: message };
      if (department) payload.department = department;

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (res.ok && data.success) {
              if (formSuccess) formSuccess.hidden = false;
              contactForm.style.display = 'none';
              var formCard = contactForm.closest('.contact-form-card');
              if (formCard) formCard.style.display = 'none';
              if (formSuccess) formSuccess.focus({ focusVisible: true });
            } else {
              if (formError) {
                formError.textContent = data.error || 'Something went wrong. Please try again or email us directly.';
                formError.hidden = false;
              }
              if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = btnText;
              }
            }
          });
        })
        .catch(function () {
          if (formError) {
            formError.textContent = 'Unable to send. Opening your email client instead…';
            formError.hidden = false;
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = btnText;
          }
          var departmentEmails = { general: 'info@schmiedeler.com', sales: 'sales@schmiedeler.com', accounting: 'accounting@schmiedeler.com' };
          var toEmail = (department && departmentEmails[department]) ? departmentEmails[department] : 'info@schmiedeler.com';
          var subjectLine = 'Schmiedeler.com: ' + (department ? '[' + department + '] ' : '') + subject;
          var body = 'Name: ' + name + '\nEmail: ' + email + (department ? '\nDepartment: ' + department : '') + '\n\n' + message;
          window.location.href = 'mailto:' + toEmail + '?subject=' + encodeURIComponent(subjectLine) + '&body=' + encodeURIComponent(body);
        });
    });
  }
})();
