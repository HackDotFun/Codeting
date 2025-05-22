// assets/script.js

// Read Supabase credentials from meta tags
const SUPABASE_URL = document.querySelector('meta[name="supabase-url"]').content;
const SUPABASE_KEY = document.querySelector('meta[name="supabase-key"]').content;
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Pagination state
let lbData = [];
let blData = [];
let lbPage = 0;
let blPage = 0;
const PAGE_SIZE = 10;

// Utility to abbreviate IDs
function abbr(s) {
  return s.length > 6 ? `${s.slice(0,3)}...${s.slice(-3)}` : s;
}

// Render a page of items into a given UL and pagination controls
function renderPage(data, page, ulSelector, controlsSelector, formatFn) {
  const ul = document.querySelector(ulSelector);
  ul.innerHTML = '';
  const start = page * PAGE_SIZE;
  const pageItems = data.slice(start, start + PAGE_SIZE);
  pageItems.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'list-group-item bg-dark text-light';
    li.textContent = formatFn(item, start + i);
    ul.appendChild(li);
  });
  // Controls
  const controls = document.querySelector(controlsSelector);
  controls.innerHTML = '';
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const prev = document.createElement('button');
  prev.className = 'btn btn-outline-light me-2';
  prev.textContent = 'Previous';
  prev.disabled = page === 0;
  prev.onclick = () => { lbPage = (ulSelector.includes('leaderboard') ? lbPage : lbPage); blPage = ulSelector.includes('battle-log') ? blPage - 1 : blPage; loadStats(); };
  const next = document.createElement('button');
  next.className = 'btn btn-outline-light';
  next.textContent = 'Next';
  next.disabled = page >= totalPages - 1;
  next.onclick = () => { lbPage = ulSelector.includes('leaderboard') ? lbPage + 1 : lbPage; blPage = ulSelector.includes('battle-log') ? blPage + 1 : blPage; loadStats(); };
  controls.append(prev, next);
}

async function loadStats() {
  // Leaderboard
  try {
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .select('telegram_id, plays, wins')
      .order('wins', { ascending: false });
    if (error) throw error;
    lbData = data;
    renderPage(lbData, lbPage,
      '.leaderboard ul', '.leaderboard-controls',
      (r, idx) => `${idx+1}. @${r.telegram_id} – ${r.plays} games / ${r.wins} wins`
    );
  } catch (err) {
    console.error('Error loading leaderboard:', err);
  }

  // Battle Log
  try {
    const { data, error } = await supabaseClient
      .from('games')
      .select('session_id, winner_user_id, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    blData = data;
    renderPage(blData, blPage,
      '.battle-log ul', '.battle-log-controls',
      (b, idx) => `#${b.session_id}: Winner ${abbr(b.winner_user_id.toString())} @ ${new Date(b.created_at).toLocaleString()}`
    );
  } catch (err) {
    console.error('Error loading battle log:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Section reveal
  const sections = document.querySelectorAll('section');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.3 });
  sections.forEach(sec => observer.observe(sec));

  // Add pagination containers
  document.querySelector('.leaderboard').insertAdjacentHTML('beforeend',
    '<div class="leaderboard-controls mt-3 text-center"></div>'
  );
  document.querySelector('.battle-log').insertAdjacentHTML('beforeend',
    '<div class="battle-log-controls mt-3 text-center"></div>'
  );

  // Load data
  loadStats();
});
