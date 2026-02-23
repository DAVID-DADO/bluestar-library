/* ================================================================
   upload.js — Blue Star Library v2  |  גרסה יציבה סופית
   ================================================================
   כולל:
   - Optional chaining  (ph?.querySelector)
   - Safe DOM access    (if (!ph) return)
   - Flexible selector  (.hi-title, .pt, .img-ph-title)
   - State management   (reload רק אחרי ok מהשרת)
   - alias אחורה       (uploadHeroImage → uploadImage)
   ================================================================ */

const SERVER = 'http://localhost:7771';

/* ── triggerUpload ──────────────────────────────────────────────
   קורא מ-onclick של כל כפתור upload.
   מחפש input[type=file] סמוך ופותח אותו.
   אם לא נמצא — לא קורס, רק יוצא.
*/
function triggerUpload(btn) {
  if (!btn) return;
  const input = btn.nextElementSibling;
  if (input?.type === 'file') input.click();
}

/* ── uploadImage ────────────────────────────────────────────────
   פונקציה יחידה לכל סוגי ה-placeholder:
     hero-img-ph  →  תמונת banner (מחלקה .hi-title)
     ph           →  תמונת פרק פנימי (מחלקה .pt)
     img-ph       →  תמונת specs/news פנימית (מחלקה .img-ph-title)

   Safe DOM access בכל שלב — אין קריסה אם אלמנט חסר.
*/
function uploadImage(input) {
  if (!input) return;

  /* מציאת ה-placeholder הכי קרוב */
  const ph = input.closest('.hero-img-ph, .ph, .img-ph');
  if (!ph) return;

  const file = input.files?.[0];
  if (!file) return;

  /* זיהוי סוג */
  const isHero    = ph.classList.contains('hero-img-ph');
  const slotId    = ph.dataset?.slot   ?? '';
  const htmlFile  = ph.dataset?.html   ?? '';

  /* selector גמיש — תומך בכל סוגי ה-placeholder */
  const titleEl   = ph.querySelector('.hi-title, .pt, .img-ph-title');
  const titleText = titleEl
    ? titleEl.textContent.replace(/^📷\s*/, '').trim()
    : (slotId || 'Image');

  /* כפתור — מחפש לפי סוג */
  const btn = isHero
    ? ph.querySelector('.hero-img-btn')
    : ph.querySelector('.ph-upload-btn, .img-ph-btn');

  /* state: נועל כפתור למניעת כפל העלאות */
  if (btn) {
    btn.textContent = 'שומר...';
    btn.disabled    = true;
  }

  /* בנה FormData */
  const fd = new FormData();
  fd.append('file',          file);
  fd.append('slot_id',       slotId);
  fd.append('html_file',     htmlFile);
  fd.append('caption_title', titleText);

  fetch(SERVER + '/upload', { method: 'POST', body: fd })
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => {
      if (!data.ok) throw new Error(data.error || 'server error');

      /* ── הצלחה: מחליף placeholder בתמונה ── */
      if (isHero) {
        /* hero banner — div עם img full-width */
        const wrap = document.createElement('div');
        wrap.className    = 'hero-img-wrap';
        wrap.dataset.slot = slotId;
        const img = document.createElement('img');
        img.src   = '../../site/assets/images/' + data.saved;
        img.alt   = titleText;
        wrap.appendChild(img);
        ph.replaceWith(wrap);
      } else {
        /* פנימי — figure עם caption */
        const fig = document.createElement('figure');
        fig.className    = 'ph-done';
        fig.dataset.slot = slotId;
        const img = document.createElement('img');
        img.src           = '../../site/assets/images/' + data.saved;
        img.alt           = titleText;
        img.style.cssText = 'width:100%;border-radius:8px;display:block;';
        const cap = document.createElement('figcaption');
        cap.className   = 'ph-cap';
        cap.textContent = titleText;
        fig.appendChild(img);
        fig.appendChild(cap);
        ph.replaceWith(fig);
      }

      /* reload רק אחרי ok מהשרת — מניעת לולאות */
      /* location.reload(); — מושבת, מיותר, DOM כבר עודכן */
    })
    .catch(err => {
      console.error('[upload.js]', err);
      /* שחרר כפתור לניסיון חוזר */
      if (btn) {
        btn.textContent = 'שגיאה — נסה שוב';
        btn.disabled    = false;
      }
    });
}

/* ── alias לתאימות אחורה ────────────────────────────────────── */
function uploadHeroImage(input) { uploadImage(input); }
