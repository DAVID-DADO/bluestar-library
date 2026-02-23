

/* ================================================================
   SCROLL REVEAL — Intersection Observer
   מפעיל class="visible" על .ch ו-.sec כשנכנסים ל-viewport.
   רץ רק אחרי DOMContentLoaded, כולל null-checks מלאים.
   ================================================================ */

(function initScrollReveal() {
  /* בדיקת תמיכה */
  if (typeof IntersectionObserver === 'undefined') {
    /* דפדפנים ישנים — חשיפה מיידית ללא אנימציה */
    document.querySelectorAll('.ch, .sec').forEach(function(el) {
      el.classList.add('visible');
    });
    return;
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); /* פעם אחת מספיקה */
      }
    });
  }, {
    threshold: 0.08,        /* 8% נראה = מתחיל */
    rootMargin: '0px 0px -24px 0px'  /* קצת לפני קצה תחתון */
  });

  function attachObserver() {
    var els = document.querySelectorAll('.ch, .sec');
    if (!els || els.length === 0) return; /* לא קורס אם אין אלמנטים */
    els.forEach(function(el) { observer.observe(el); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachObserver);
  } else {
    attachObserver(); /* DOM כבר מוכן */
  }
})();
