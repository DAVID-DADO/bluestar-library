/* ================================================================
   upload.js — Blue Star Library v2  |  GitHub-backed storage
   ================================================================
   תמונות נשמרות ב-GitHub repo ו-Vercel עושה redeploy אוטומטי.
   כולם רואים את אותן תמונות.
   ================================================================ */

let GH_TOKEN = '';
async function getToken() {
  if (GH_TOKEN) return GH_TOKEN;
  try {
    const r = await fetch('/api/token');
    const d = await r.json();
    GH_TOKEN = d.token || '';
  } catch(e) { GH_TOKEN = ''; }
  return GH_TOKEN;
}
const GH_OWNER = 'DAVID-DADO';
const GH_REPO  = 'bluestar-library';
const GH_BRANCH = 'main';

/* ── עזר: המרת קובץ ל-base64 ── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ── עזר: קבלת SHA של קובץ קיים ב-GitHub ── */
async function getFileSha(repoPath) {
  const token = await getToken();
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${repoPath}?ref=${GH_BRANCH}`;
  const r = await fetch(url, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.sha || null;
}

/* ── עזר: כתיבת קובץ ל-GitHub ── */
async function writeToGitHub(repoPath, base64Content, commitMsg) {
  const token = await getToken();
  const sha = await getFileSha(repoPath);
  const body = { message: commitMsg, content: base64Content, branch: GH_BRANCH };
  if (sha) body.sha = sha;

  const r = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${repoPath}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('GitHub write failed: ' + r.status);
  return await r.json();
}

/* ── עזר: קריאת HTML קובץ מ-GitHub ── */
async function readHtmlFromGitHub(repoPath) {
  const token = await getToken();
  const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${repoPath}?ref=${GH_BRANCH}`;
  const r = await fetch(url, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (!r.ok) throw new Error('GitHub read failed: ' + r.status);
  const data = await r.json();
  return { content: atob(data.content.replace(/\n/g, '')), sha: data.sha };
}

/* ── עזר: החלפת placeholder ב-HTML string ── */
function replacePlaceholderInHtml(html, slotId, imgRepoPath, captionTitle, isHero) {
  if (isHero) {
    /* hero: מחפש div.hero-img-ph עם data-slot תואם */
    const re = new RegExp(
      `<div[^>]*class="hero-img-ph"[^>]*data-slot="${slotId}"[^>]*>[\\s\\S]*?</div>\\s*</div>`,
      'g'
    );
    const replacement =
      `<div class="hero-img-wrap" data-slot="${slotId}">` +
      `<img src="../../assets/images/${imgRepoPath.split('/').pop()}" alt="${captionTitle}" style="width:100%;height:440px;object-fit:cover;">` +
      `</div>`;
    return html.replace(re, replacement);
  } else {
    /* פנימי: מחפש div.ph או div.img-ph עם data-slot תואם */
    const re = new RegExp(
      `<div[^>]*class="(?:ph|img-ph)"[^>]*data-slot="${slotId}"[^>]*>[\\s\\S]*?</div>`,
      'g'
    );
    const replacement =
      `<figure class="ph-done" data-slot="${slotId}">` +
      `<img src="../../assets/images/${imgRepoPath.split('/').pop()}" alt="${captionTitle}" style="width:100%;border-radius:8px;display:block;">` +
      `<figcaption class="ph-cap">${captionTitle}</figcaption>` +
      `</figure>`;
    return html.replace(re, replacement);
  }
}

/* ── triggerUpload ── */
function triggerUpload(btn) {
  if (!btn) return;
  const input = btn.nextElementSibling;
  if (input?.type === 'file') input.click();
}

/* ── uploadImage — פונקציה ראשית ── */
async function uploadImage(input) {
  if (!input) return;

  const file = input.files?.[0];
  if (!file) return;

  // נסה לקרוא slot מה-parent הישיר (כפתור + input בתוך container)
  const ph = input.closest('.hero-img-ph, .ph, .img-ph');
  const btn = input.previousElementSibling;

  // קרא slot מה-data-slot של הכפתור, ה-ph, או כל אב עם data-slot
  const slotEl = ph || input.closest('[data-slot]') || btn?.closest('[data-slot]');
  const slotId = slotEl?.dataset?.slot
    || btn?.dataset?.slot
    || input.dataset?.slot
    || '';

  // קרא html path — מה-ph או מה-data-html של הכפתור
  const htmlFile = ph?.dataset?.html
    || btn?.dataset?.html
    || input.dataset?.html
    || '';

  if (!slotId || !htmlFile) {
    console.error('[upload] missing slot or htmlFile', {slotId, htmlFile});
    return;
  }

  const isHero = ph ? ph.classList.contains('hero-img-ph') : slotId.includes('hero');

  const titleEl   = ph.querySelector('.hi-title, .pt, .img-ph-title');
  const titleText = titleEl
    ? titleEl.textContent.replace(/^📷\s*/, '').trim()
    : (slotId || 'Image');

  const btn = isHero
    ? ph.querySelector('.hero-img-btn')
    : ph.querySelector('.ph-upload-btn, .img-ph-btn');

  if (btn) { btn.textContent = 'שומר ב-GitHub...'; btn.disabled = true; }

  try {
    /* 1. המר תמונה ל-base64 */
    const imgBase64 = await fileToBase64(file);

    /* 2. קבע שם קובץ ונתיב ב-repo */
    const ext       = file.name.split('.').pop().toLowerCase();
    const imgName   = `${slotId}.${ext}`;
    const imgPath   = `assets/images/${imgName}`;

    /* 3. העלה תמונה ל-GitHub */
    if (btn) btn.textContent = 'מעלה תמונה...';
    await writeToGitHub(imgPath, imgBase64, `image: ${slotId}`);

    /* 4. קרא את ה-HTML הנוכחי מ-GitHub ועדכן */
    if (btn) btn.textContent = 'מעדכן דף...';
    const { content: htmlContent, sha: htmlSha } = await readHtmlFromGitHub(htmlFile);
    const updatedHtml = replacePlaceholderInHtml(htmlContent, slotId, imgPath, titleText, isHero);

    /* 5. כתוב HTML מעודכן ל-GitHub */
    const token = await getToken();
    const htmlBase64 = btoa(unescape(encodeURIComponent(updatedHtml)));
    await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${htmlFile}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `embed image: ${slotId}`,
        content: htmlBase64,
        sha: htmlSha,
        branch: GH_BRANCH
      })
    });

    /* 6. עדכן DOM מיידית (לפני redeploy) */
    if (isHero) {
      const wrap = document.createElement('div');
      wrap.className = 'hero-img-wrap';
      wrap.dataset.slot = slotId;
      const img = document.createElement('img');
      img.src = `../../assets/images/${imgName}`;
      img.alt = titleText;
      img.style.cssText = 'width:100%;height:440px;object-fit:cover;';
      wrap.appendChild(img);
      ph.replaceWith(wrap);
    } else {
      const fig = document.createElement('figure');
      fig.className = 'ph-done';
      fig.dataset.slot = slotId;
      const img = document.createElement('img');
      img.src = `../../assets/images/${imgName}`;
      img.alt = titleText;
      img.style.cssText = 'width:100%;border-radius:8px;display:block;';
      const cap = document.createElement('figcaption');
      cap.className = 'ph-cap';
      cap.textContent = titleText;
      fig.appendChild(img);
      fig.appendChild(cap);
      ph.replaceWith(fig);
    }

    /* הודעת הצלחה */
    const notice = document.createElement('div');
    notice.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#2D5A1A;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;z-index:9999;';
    notice.textContent = 'התמונה נשמרה. הדף יתעדכן לכולם תוך ~30 שניות.';
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 5000);

  } catch (err) {
    console.error('[upload.js]', err);
    if (btn) { btn.textContent = 'שגיאה, נסה שוב'; btn.disabled = false; }
  }
}

/* alias */
function uploadHeroImage(input) { uploadImage(input); }
