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

  // Department chooser: select department, show that department's form, hide others (event delegation)
  var departmentChooser = document.getElementById('department-chooser');
  var departmentChosenEl = document.getElementById('department-chosen');
  var contactSection = document.getElementById('contact');
  var formPrompt = document.getElementById('form-prompt');
  var formCardIds = { general: 'contact-form-general', sales: 'contact-form-sales', accounting: 'contact-form-accounting' };
  if (departmentChooser && contactSection) {
    departmentChooser.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.department-btn');
      if (!btn) return;
      var dept = btn.getAttribute('data-department');
      var label = btn.getAttribute('data-label');
      if (!dept || !formCardIds[dept]) return;
      var allBtns = departmentChooser.querySelectorAll('.department-btn');
      for (var i = 0; i < allBtns.length; i++) allBtns[i].classList.remove('is-selected');
      btn.classList.add('is-selected');
      if (formPrompt) formPrompt.hidden = true;
      for (var key in formCardIds) {
        var card = document.getElementById(formCardIds[key]);
        if (card) card.hidden = key !== dept;
      }
      if (departmentChosenEl) {
        departmentChosenEl.hidden = false;
        departmentChosenEl.textContent = 'Sending to: ' + (label || dept) + '. Fill in the form below.';
      }
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Contact forms: one handler for all department forms (POST /api/contact, fallback mailto)
  var formSuccess = document.getElementById('form-success');
  var formError = document.getElementById('form-error');
  var contactFormsContainer = document.getElementById('contact');
  if (contactFormsContainer) {
    contactFormsContainer.addEventListener('submit', function (e) {
      var form = e.target && e.target.closest && e.target.closest('form.js-contact-form');
      if (!form) return;
      e.preventDefault();
      var fd = new FormData(form);
      var name = (fd.get('name') || '').trim();
      var email = (fd.get('email') || '').trim();
      var subject = (fd.get('subject') || '').trim();
      var message = (fd.get('message') || '').trim();
      var department = (fd.get('department') || '').trim();
      if (!name || !email || !subject || !message) return;

      if (formError) {
        formError.hidden = true;
        formError.textContent = '';
      }
      var submitBtn = form.querySelector('button[type="submit"]');
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
              if (formPrompt) formPrompt.hidden = true;
              var cards = contactFormsContainer.querySelectorAll('.contact-form-card');
              for (var i = 0; i < cards.length; i++) cards[i].hidden = true;
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
