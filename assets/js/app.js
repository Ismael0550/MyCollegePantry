// Sidebar toggle (mobile)
console.log('app.js: loading');
const menuBtn = document.querySelector('[data-menu]');
const sidebar = document.querySelector('.sidebar');
if (!menuBtn) console.warn('app.js: no [data-menu] button found');
if (!sidebar) console.warn('app.js: no .sidebar element found');
if (menuBtn && sidebar) {
  console.log('app.js: menu button and sidebar found — attaching handlers');
  // initialize aria state
  menuBtn.setAttribute('aria-expanded', 'false');

  menuBtn.addEventListener('click', (e) => {
    // prevent the document click handler from immediately closing it
    e.stopPropagation();
    const isOpen = sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open', isOpen);
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    console.log('app.js: menu toggled, open=', isOpen);
  });

  // Close overlay when clicking outside (only when open)
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open')) {
      // if click happened outside sidebar and not on the menuBtn
      if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    }
  });
}

// Mark active link by pathname
const path = location.pathname.replace(/\/index\.html?$/, '/');
document.querySelectorAll('.nav a').forEach(a => {
  const href = a.getAttribute('href');
  if ((path === '/' && href.endsWith('index.html')) || (href && path.endsWith(href))) {
    a.classList.add('active');
  }
});


//const menuBtn = document.querySelector('[data-menu]');
const layout = document.querySelector('.layout');

if (menuBtn && layout) {
  menuBtn.addEventListener('click', () => {
    const closed = layout.classList.toggle('is-closed');
    menuBtn.setAttribute('aria-expanded', closed ? 'false' : 'true');
  });
}

