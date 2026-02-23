/**
 * Blue Star Admin — admin.js
 * localStorage-based content manager.
 *
 * [PERSISTENCE] comments = replace with GitHub API / Vercel KV when ready.
 */

let currentData = {};

// ── INIT ──────────────────────────────────────────────────────────────────

window.onload = () => loadProduct('pistachio');

// ── LOAD / SAVE ───────────────────────────────────────────────────────────

async function loadProduct(productId) {
  // Update sidebar active state
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  event?.currentTarget?.classList?.add('active');

  // [PERSISTENCE] Replace fetch with: GET /repos/.../contents/data/{productId}.json
  const saved = localStorage.getItem(`bluestar_${productId}`);
  if (saved) {
    currentData = JSON.parse(saved);
  } else {
    try {
      const res = await fetch(`${productId}-sample.json`);
      currentData = res.ok ? await res.json()
        : { id: productId, name: productId, hero: {title:'',deck:''}, news: [], story: [], media: {} };
    } catch(e) {
      currentData = { id: productId, name: productId, hero: {title:'',deck:''}, news: [], story: [], media: {} };
    }
  }

  document.getElementById('current-product-name').textContent =
    (currentData.name || productId) + ' Dashboard';

  renderAll();
}

function saveToLocal() {
  // [PERSISTENCE] Replace with:
  // const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(currentData,null,2))));
  // const sha = await getFileSha(`data/${currentData.id}.json`);
  // await fetch(`https://api.github.com/repos/OWNER/REPO/contents/data/${currentData.id}.json`, {
  //   method: 'PUT', headers: { Authorization: `token TOKEN`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ message: `update ${currentData.id}`, content: base64, sha, branch: 'main' })
  // });
  localStorage.setItem(`bluestar_${currentData.id}`, JSON.stringify(currentData));
  toast('נשמר ✓');
}

function exportJSON() {
  const json = JSON.stringify(currentData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentData.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`הורד ${currentData.id}.json`);
}

// ── RENDER ALL ────────────────────────────────────────────────────────────

function renderAll() {
  renderNews();
  renderStory();
  renderMedia();
}

// ── NEWS ──────────────────────────────────────────────────────────────────

function renderNews() {
  const list = document.getElementById('news-editor-list');
  const articles = currentData.news || [];

  list.innerHTML = articles.map((item, i) => `
    <div class="edit-card">
      <div class="card-tag">${esc(item.tag || 'כתבה')}</div>
      <label>כותרת</label>
      <input type="text" value="${esc(item.title)}"
        onchange="currentData.news[${i}].title = this.value">
      <label>תוכן</label>
      <textarea onchange="currentData.news[${i}].body = this.value">${esc(item.body||'')}</textarea>
      <div class="input-row">
        <input type="text" value="${esc(item.tag||'')}" placeholder="תגית"
          onchange="currentData.news[${i}].tag = this.value">
        <input type="text" value="${esc(item.meta||'')}" placeholder="מקור / תאריך"
          onchange="currentData.news[${i}].meta = this.value">
      </div>
      <div style="margin-top:12px;display:flex;justify-content:flex-end">
        <button class="btn-delete" onclick="deleteNews(${i})">🗑 מחק</button>
      </div>
    </div>
  `).join('') || '<p style="color:var(--muted);padding:20px 0">אין ידיעות עדיין.</p>';
}

function addNewArticle() {
  if (!currentData.news) currentData.news = [];
  currentData.news.unshift({ title: '', body: '', tag: 'תעשייה', meta: '', isInsight: false });
  renderNews();
}

function deleteNews(i) {
  if (!confirm('למחוק?')) return;
  currentData.news.splice(i, 1);
  renderNews();
}

// ── STORY ─────────────────────────────────────────────────────────────────

function renderStory() {
  // Hero fields
  const hero = currentData.hero || {};
  const t = document.getElementById('hero-title');
  const d = document.getElementById('hero-deck');
  if (t) t.value = hero.title || '';
  if (d) d.textContent = hero.deck || '';

  // Chapters
  const chapters = currentData.story || [];
  document.getElementById('story-editor').innerHTML = chapters.map((ch, i) => `
    <div class="edit-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase">פרק ${esc(ch.chapter||String(i+1))}</span>
        <button class="btn-delete" onclick="deleteChapter(${i})">🗑</button>
      </div>
      <label>כותרת פרק</label>
      <input type="text" value="${esc(ch.title||'')}"
        onchange="currentData.story[${i}].title = this.value">
      <label>תוכן</label>
      <textarea onchange="currentData.story[${i}].content = this.value">${esc(ch.content||'')}</textarea>
    </div>
  `).join('') || '<p style="color:var(--muted);padding:20px 0">אין פרקים.</p>';
}

function addChapter() {
  if (!currentData.story) currentData.story = [];
  currentData.story.push({ chapter: String(currentData.story.length + 1), title: '', content: '' });
  renderStory();
}

function deleteChapter(i) {
  if (!confirm('למחוק פרק?')) return;
  currentData.story.splice(i, 1);
  renderStory();
}

// ── MEDIA ─────────────────────────────────────────────────────────────────

function renderMedia() {
  const media = currentData.media || {};
  const slots = Object.entries(media);

  document.getElementById('media-editor').innerHTML = `
    <div class="media-grid">
      ${slots.map(([key, url]) => `
        <div class="media-slot">
          <div class="media-preview" id="prev-${key}">
            ${url ? `<img src="${esc(url)}" onerror="this.parentElement.innerHTML='🖼'">` : '🖼'}
          </div>
          <div class="media-slot-body">
            <div class="media-slot-label">${key}</div>
            <div class="media-url-row">
              <input type="text" id="url-${key}" value="${esc(url||'')}" placeholder="נתיב / URL">
              <button onclick="updateMedia('${key}')">✓</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    ${slots.length === 0 ? '<p style="color:var(--muted);padding:20px 0">אין slots מוגדרים.</p>' : ''}
  `;
}

function updateMedia(key) {
  const url = document.getElementById(`url-${key}`).value.trim();
  currentData.media[key] = url;
  const prev = document.getElementById(`prev-${key}`);
  prev.innerHTML = url ? `<img src="${esc(url)}" onerror="this.parentElement.innerHTML='🖼'">` : '🖼';
  saveToLocal();
}

// ── TABS ──────────────────────────────────────────────────────────────────

function openTab(evt, name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  evt.currentTarget.classList.add('active');
}

// ── UTILS ─────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
