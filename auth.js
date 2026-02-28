(function() {
    const PASS = '2108';
    const KEY  = 'bs_auth';

    if (sessionStorage.getItem(KEY) === '1') {
        document.documentElement.style.overflow = '';
        return;
    }

    // build overlay
    const overlay = document.createElement('div');
    overlay.id = 'bs-auth-overlay';
    overlay.innerHTML = `
        <div id="bs-auth-box">
            <div id="bs-auth-brand">BLUE STAR<br><span>INTERNATIONAL</span></div>
            <div id="bs-auth-label">קוד גישה</div>
            <input id="bs-auth-input" type="password" maxlength="20" autocomplete="off" placeholder="· · · ·" inputmode="numeric" />
            <div id="bs-auth-err"></div>
        </div>
    `;
    document.documentElement.style.overflow = 'hidden';

    const style = document.createElement('style');
    style.textContent = `
        #bs-auth-overlay {
            position: fixed; inset: 0; z-index: 99999;
            background: #0A0A0B;
            background-image:
                linear-gradient(rgba(184,137,74,0.025) 1px, transparent 1px),
                linear-gradient(90deg, rgba(184,137,74,0.025) 1px, transparent 1px);
            background-size: 40px 40px;
            display: flex; align-items: center; justify-content: center;
        }
        #bs-auth-box {
            text-align: center;
            display: flex; flex-direction: column; align-items: center; gap: 24px;
        }
        #bs-auth-brand {
            font-family: 'Space Mono', 'Courier New', monospace;
            font-size: 11px; letter-spacing: 6px;
            color: #B8894A; line-height: 1.8;
        }
        #bs-auth-brand span {
            font-size: 8px; letter-spacing: 8px; opacity: 0.5;
        }
        #bs-auth-label {
            font-family: 'Noto Sans Hebrew', 'Arial Hebrew', sans-serif;
            font-size: 11px; letter-spacing: 4px;
            color: rgba(250,247,240,0.3);
        }
        #bs-auth-input {
            background: transparent;
            border: none; border-bottom: 1px solid rgba(184,137,74,0.4);
            outline: none;
            color: #FAF7F0;
            font-size: 28px; letter-spacing: 12px;
            text-align: center;
            width: 160px; padding: 8px 0;
            font-family: 'Space Mono', monospace;
            caret-color: #B8894A;
            transition: border-color 0.3s;
        }
        #bs-auth-input:focus {
            border-bottom-color: #B8894A;
        }
        #bs-auth-err {
            font-family: 'Space Mono', monospace;
            font-size: 9px; letter-spacing: 3px;
            color: #c0392b; height: 14px;
            transition: opacity 0.3s;
        }
        #bs-auth-overlay.shake #bs-auth-box {
            animation: authShake 0.35s ease;
        }
        @keyframes authShake {
            0%,100% { transform: translateX(0); }
            20%      { transform: translateX(-8px); }
            40%      { transform: translateX(8px); }
            60%      { transform: translateX(-5px); }
            80%      { transform: translateX(5px); }
        }
        #bs-auth-overlay.fade-out {
            animation: authFade 0.4s ease forwards;
        }
        @keyframes authFade {
            to { opacity: 0; pointer-events: none; }
        }
    `;
    document.head.appendChild(style);

    function attempt(val) {
        if (val === PASS) {
            sessionStorage.setItem(KEY, '1');
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.remove();
                document.documentElement.style.overflow = '';
            }, 420);
        } else {
            document.getElementById('bs-auth-err').textContent = 'שגוי';
            overlay.classList.remove('shake');
            void overlay.offsetWidth;
            overlay.classList.add('shake');
            document.getElementById('bs-auth-input').value = '';
            setTimeout(() => {
                document.getElementById('bs-auth-err').textContent = '';
            }, 1400);
        }
    }

    document.getElementById('bs-auth-input', overlay).addEventListener('keydown', function(e) {
        if (e.key === 'Enter') attempt(this.value.trim());
    });

    // wait for DOM then append + focus
    function mount() {
        document.body.prepend(overlay);
        setTimeout(() => document.getElementById('bs-auth-input').focus(), 50);
    }

    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount);

})();
