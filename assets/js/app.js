// Sidebar toggle (mobile)
const menuBtn = document.querySelector('[data-menu]');
const sidebar = document.querySelector('.sidebar');
if (menuBtn && sidebar) {
  menuBtn.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open', isOpen);
  });
  // Close overlay when clicking outside
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      document.body.classList.remove('sidebar-open');
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
