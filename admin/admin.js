/**
 * Blue Star Admin — admin.js v1.3
 * localStorage-first token + GitHub image upload
 */

const GITHUB = {
  owner:  'DAVID-DADO',
  repo:   'bluestar-library',
  branch: 'main',
  token:  null
};

let currentData   = {};
let pendingUpload = null;

// ── TOKEN ─────────────────────────────────────────────────────────────────
// Priority: memory → localStorage → /api/token → prompt

async function getGitHubToken() {
  if (GITHUB.token) return GITHUB.token;

  // 1. localStorage (fastest — survives page refresh)
  const stored = localStorage.getItem('bluestar_gh_token');
  if (stored) { GITHUB.token = stored; return GITHUB.token; }

  // 2. /api/token (works if Vercel project auth is off)
  try {
    const r = await fetch('/api/token');
    if (r.ok) {
      const d = await r.json();
      if (d.token || d.GITHUB_TOKEN) {
        GITHUB.token = d.token || d.GITHUB_TOKEN;
        localStorage.setItem('bluestar_gh_token', GITHUB.token);
        return GITHUB.token;
      }
    }
  } catch(e) {}

  // 3. Prompt once — save to localStorage for all future sessions
  const manual = prompt(
    'GitHub Personal Access Token לא נמצא.\n' +
    'הכנס token עם הרשאת repo — ישמר בדפדפן:'
  );
  if (manual && manual.trim()) {
    GITHUB.token = manual.trim();
    localStorage.setItem('bluestar_gh_token', GITHUB.token);
  }

  return GITHUB.token;
}

// Clear token (if need to reset)
function resetToken() {
  localStorage.removeItem('bluestar_gh_token');
  GITHUB.token = null;
  toast('Token נמחק — רענן דף');
}

// ── INIT ──────────────────────────────────────────────────────────────────

window.onload = async () => {
  await getGitHubToken();
  document.getElementById('global-file-input').addEventListener('change', handleFileSelected);
  loadProduct('pistachio', document.querySelector('.nav-btn.active'));
};

// ── LOAD / SAVE ───────────────────────────────────────────────────────────

async function loadProduct(productId, btn) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const saved = localStorage.getItem(`bluestar_${productId}`);
  if (saved) {
    currentData = JSON.parse(saved);
  } else {
    try {
      const res = await fetch(`${productId}-sample.json`);
      currentData = res.ok ? await res.json() : emptySkeleton(productId);
    } catch(e) { currentData = emptySkeleton(productId); }
  }

  document.getElementById('current-product-name').textContent =
    (currentData.name || productId) + ' Dashboard';

  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));
  document.getElementById('news').classList.add('active');
  document.querySelector('.tab-link').classList.add('active');

  renderAll();
}

function saveToLocal() {
  localStorage.setItem(`bluestar_${currentData.id}`, JSON.stringify(currentData));
  toast('נשמר ✓');
}

function exportJSON() {
  const json = JSON.stringify(currentData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `${currentData.id}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast(`הורד ${currentData.id}.json`);
}

function emptySkeleton(id) {
  return { id, name: id, hero: { title: id, deck: '', image: '' },
           story: [], news: [], media: {} };
}

// ── RENDER ALL ────────────────────────────────────────────────────────────

function renderAll() { renderNews(); renderStory(); renderMedia(); }

// ── NEWS ──────────────────────────────────────────────────────────────────

function renderNews() {
  const articles = currentData.news || [];
  document.getElementById('news-editor-list').innerHTML =
    articles.map((item, i) => `
      <div class="edit-card">
        <div class="card-tag">${esc(item.tag || 'כתבה')}</div>
        <label>כותרת</label>
        <input type="text" value="${esc(item.title)}" onchange="currentData.news[${i}].title=this.value">
        <label>תוכן</label>
        <textarea onchange="currentData.news[${i}].body=this.value">${esc(item.body||'')}</textarea>
        <div class="input-row">
          <input type="text" value="${esc(item.tag||'')}" placeholder="תגית"
            onchange="currentData.news[${i}].tag=this.value">
          <input type="text" value="${esc(item.meta||'')}" placeholder="מקור / תאריך"
            onchange="currentData.news[${i}].meta=this.value">
        </div>
        <div style="margin-top:12px;display:flex;justify-content:flex-end">
          <button class="btn-delete" onclick="deleteNews(${i})">🗑 מחק</button>
        </div>
      </div>
    `).join('') || '<p style="color:var(--muted);padding:20px 0">אין ידיעות.</p>';
}

function addNewArticle() {
  if (!currentData.news) currentData.news = [];
  currentData.news.unshift({ title:'', body:'', tag:'תעשייה', meta:'', isInsight:false });
  renderNews();
}

function deleteNews(i) {
  if (!confirm('למחוק?')) return;
  currentData.news.splice(i, 1);
  renderNews();
}

// ── STORY ─────────────────────────────────────────────────────────────────

function renderStory() {
  const hero = currentData.hero || {};
  const t = document.getElementById('hero-title');
  const d = document.getElementById('hero-deck');
  if (t) t.value       = hero.title || '';
  if (d) d.textContent = hero.deck  || '';

  const chapters = currentData.story || [];
  document.getElementById('story-editor').innerHTML =
    chapters.map((ch, i) => `
      <div class="edit-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase">
            פרק ${esc(ch.chapter||String(i+1))}
          </span>
          <button class="btn-delete" onclick="deleteChapter(${i})">🗑</button>
        </div>
        <label>כותרת פרק</label>
        <input type="text" value="${esc(ch.title||'')}" onchange="currentData.story[${i}].title=this.value">
        <label>תוכן</label>
        <textarea onchange="currentData.story[${i}].content=this.value">${esc(ch.content||'')}</textarea>
      </div>
    `).join('') || '<p style="color:var(--muted);padding:20px 0">אין פרקים.</p>';
}

function addChapter() {
  if (!currentData.story) currentData.story = [];
  currentData.story.push({ chapter: String(currentData.story.length+1), title:'', content:'' });
  renderStory();
}

function deleteChapter(i) {
  if (!confirm('למחוק פרק?')) return;
  currentData.story.splice(i, 1);
  renderStory();
}

// ── MEDIA ─────────────────────────────────────────────────────────────────

function toPreviewUrl(url) {
  // Convert ../assets/images/x.jpg → raw GitHub URL for preview in admin
  if (url && url.startsWith('../assets/')) {
    const path = url.replace('../', '');
    return `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${path}`;
  }
  return url;
}

function renderMedia() {
  const media = currentData.media || {};
  const slots = Object.entries(media);

  document.getElementById('media-editor').innerHTML = `
    <div class="media-grid">
      ${slots.map(([key, url]) => `
        <div class="media-slot" id="slot-${key}">
          <div class="media-preview" id="prev-${key}">
            ${url ? `<img src="${toPreviewUrl(url)}" onerror="this.parentElement.innerHTML='🖼'">` : '<span>🖼</span>'}
          </div>
          <div class="media-slot-body">
            <div class="media-slot-label">${key}</div>
            <div style="font-size:10px;color:var(--muted);margin-bottom:8px;font-family:monospace">
              assets/images/${currentData.id}-${key}.jpg
            </div>
            <button class="btn btn-save" style="width:100%;margin-bottom:8px;justify-content:center"
              onclick="triggerUpload('${key}')">📤 העלה תמונה</button>
            <div class="media-url-row">
              <input type="text" id="url-${key}" value="${esc(url||'')}" placeholder="או הכנס URL...">
              <button onclick="updateMediaUrl('${key}')">✓</button>
            </div>
            <div id="status-${key}" style="font-size:11px;color:var(--muted);margin-top:6px;min-height:16px"></div>
          </div>
        </div>
      `).join('')}
    </div>
    ${slots.length === 0 ? '<p style="color:var(--muted);padding:20px 0">אין slots מוגדרים.</p>' : ''}
    <div style="margin-top:16px">
      <button class="btn" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:11px"
        onclick="resetToken()">🔑 אפס Token</button>
    </div>
  `;
}

function triggerUpload(slotKey) {
  pendingUpload = { slotKey, productId: currentData.id };
  document.getElementById('global-file-input').value = '';
  document.getElementById('global-file-input').click();
}

async function handleFileSelected(e) {
  const file = e.target.files[0];
  if (!file || !pendingUpload) return;

  const { slotKey, productId } = pendingUpload;
  const statusEl = document.getElementById(`status-${slotKey}`);
  const prevEl   = document.getElementById(`prev-${slotKey}`);
  const ext      = file.name.split('.').pop().toLowerCase() || 'jpg';
  const ghPath   = `assets/images/${productId}-${slotKey}.${ext}`;
  const localUrl = `../${ghPath}`;
  // Raw GitHub URL for preview (works from any path)
  const rawUrl   = `https://raw.githubusercontent.com/${GITHUB.owner}/${GITHUB.repo}/${GITHUB.branch}/${ghPath}`;

  statusEl.style.color = 'var(--muted)';
  statusEl.textContent = 'מעלה...';

  try {
    const base64 = await fileToBase64(file);
    const result = await uploadToGitHub(ghPath, base64);

    if (result.ok) {
      currentData.media[slotKey] = localUrl;
      document.getElementById(`url-${slotKey}`).value = localUrl;
      // Preview via raw GitHub (cache-busted) — no path issues
      prevEl.innerHTML = `<img src="${rawUrl}?t=${Date.now()}" onerror="this.src='${rawUrl}'">`;
      statusEl.style.color = 'var(--accent-h)';
      statusEl.textContent = `✓ ${ghPath}`;
      saveToLocal();
      toast(`הועלה — ${ghPath}`);
    } else {
      throw new Error(result.error);
    }
  } catch(err) {
    statusEl.style.color = 'var(--red)';
    statusEl.textContent = `שגיאה: ${err.message}`;
    console.error('[Admin Upload]', err);
    toast('שגיאה — ראה Console (F12)');
  }

  pendingUpload = null;
}

// ── GITHUB UPLOAD ─────────────────────────────────────────────────────────

async function uploadToGitHub(path, base64data) {
  const token = await getGitHubToken();
  if (!token) return { ok: false, error: 'חסר Token' };

  const url = `https://api.github.com/repos/${GITHUB.owner}/${GITHUB.repo}/contents/${path}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    'Accept':        'application/vnd.github.v3+json'
  };

  // SHA required if file exists
  let sha = null;
  try {
    const check = await fetch(url, { headers });
    if (check.ok) { sha = (await check.json()).sha; }
  } catch(e) {}

  const body = { message: `upload: ${path} [skip ci]`, content: base64data, branch: GITHUB.branch };
  if (sha) body.sha = sha;

  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { msg = (await res.json()).message || msg; } catch(e) {}
    // Token error — clear it so next attempt prompts again
    if (res.status === 401) {
      localStorage.removeItem('bluestar_gh_token');
      GITHUB.token = null;
      msg = 'Token לא תקין — רענן ונסה שנית';
    }
    return { ok: false, error: msg };
  }
  return { ok: true };
}

function updateMediaUrl(key) {
  const url = document.getElementById(`url-${key}`).value.trim();
  currentData.media[key] = url;
  document.getElementById(`prev-${key}`).innerHTML = url
    ? `<img src="${esc(url)}" onerror="this.parentElement.innerHTML='🖼'">`
    : '<span>🖼</span>';
  saveToLocal();
  toast('עודכן ✓');
}

// ── TABS ──────────────────────────────────────────────────────────────────

function openTab(evt, name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  evt.currentTarget.classList.add('active');
}

// ── UTILS ─────────────────────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
