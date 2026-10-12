history.scrollRestoration = 'manual';
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const preloader = $('#preloader');
  const cover = $('#cover');
  const openInvite = $('#openInvite');
  const main = $('#main');
  const envelopeVideo = $('#envelopeVideo');
  const coverStatus = $('#coverStatus');
  const music = $('#bgMusic');
  const musicToggle = $('#musicToggle');
  const musicIcon = $('#musicIcon');
  let opened = false;
  let toastTimer;

  const announce = (message) => {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  };

  // The preload screen stops even if remote font requests fail.
  const ready = () => setTimeout(() => preloader.classList.add('loaded'), 450);
  if (document.readyState === 'complete') ready();
  else window.addEventListener('load', ready, { once: true });
  setTimeout(() => preloader.classList.add('loaded'), 3500);

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.10, rootMargin: '0px 0px -24px 0px' })
    : null;
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (el.closest('.hero')) return; // Hero titles wait until the envelope has finished.
    if (observer) observer.observe(el);
    else el.classList.add('revealed');
  });

  // Opening and website are ONE continuous visual: the final MP4 frame and
  // the first hero background are the same decoded frame, in the same crop.
  // Never start another video at the handoff, as its first frame may differ.
  let openingFallback = null;
  let revealed = false;
  let prepared = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const prepareSite = () => {
    if (prepared) return;
    prepared = true;
    // Construct the next screen under the fully opaque cover BEFORE the video ends.
    // No opacity animation or video decode is involved on the transition frame.
    main.classList.add('prepared', 'visible');
  };

  const finishTransition = () => {
    cover.hidden = true;
    cover.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    window.scrollTo(0, 0);
    musicToggle.hidden = false;
  };

  const showSite = () => {
    if (revealed) return;
    revealed = true;
    clearTimeout(openingFallback);
    prepareSite();
    main.inert = false;
    coverStatus.textContent = 'Invito aperto';

    // Let the newly composed background settle for two compositor frames.
    // Crossfade the last video image into the identical hero still.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      main.classList.add('is-open');
      cover.classList.add('dismissed');
      document.querySelectorAll('.hero [data-reveal]').forEach((el, i) => {
        setTimeout(() => el.classList.add('revealed'), 550 + i * 185);
      });
    }));

    let finished = false;
    const finishOnce = () => {
      if (finished) return;
      finished = true;
      finishTransition();
    };
    cover.addEventListener('transitionend', (event) => {
      if (event.target === cover && event.propertyName === 'opacity') finishOnce();
    }, { once: true });
    // transitionend may not fire when Safari changes tabs mid-transition.
    setTimeout(finishOnce, reducedMotion ? 100 : 1350);
  };

  envelopeVideo.addEventListener('ended', showSite);
  envelopeVideo.addEventListener('error', () => { if (opened) showSite(); });
  openInvite.addEventListener('click', async () => {
    if (opened) return;
    opened = true;
    openInvite.disabled = true;
    window.scrollTo(0, 0);
    prepareSite();
    cover.classList.add('opening');
    coverStatus.textContent = 'Apertura della busta in corso';
    if (reducedMotion) {
      showSite();
      return;
    }
    openingFallback = setTimeout(showSite, 6300);
    try {
      envelopeVideo.currentTime = 0;
      await envelopeVideo.play();
    } catch (_) {
      // Unsupported WebViews still get a working invitation.
      setTimeout(showSite, 450);
    }
  });

  musicToggle.addEventListener('click', async () => {
    if (music.paused) {
      try {
        music.volume = 0.42;
        await music.play();
        musicToggle.classList.add('playing');
        musicToggle.setAttribute('aria-pressed', 'true');
        musicToggle.setAttribute('aria-label', 'Disattiva la musica');
        musicIcon.textContent = '♫';
      } catch (_err) {
        announce('La musica non è disponibile su questo dispositivo.');
      }
    } else {
      music.pause();
      musicToggle.classList.remove('playing');
      musicToggle.setAttribute('aria-pressed', 'false');
      musicToggle.setAttribute('aria-label', 'Attiva la musica');
      musicIcon.textContent = '♫';
    }
  });


  const womenTab = $('#tabWomen');
  const menTab = $('#tabMen');
  const showLook = (women) => {
    womenTab.classList.toggle('active', women);
    menTab.classList.toggle('active', !women);
    womenTab.setAttribute('aria-selected', String(women));
    menTab.setAttribute('aria-selected', String(!women));
    $('#lookWomen').hidden = !women;
    $('#lookMen').hidden = women;
  };
  womenTab.addEventListener('click', () => showLook(true));
  menTab.addEventListener('click', () => showLook(false));

  const showBank = $('#showBank');
  showBank.addEventListener('click', () => {
    const details = $('#bankDetails');
    const visible = details.hidden;
    details.hidden = !visible;
    showBank.setAttribute('aria-expanded', String(visible));
    showBank.innerHTML = visible ? 'NASCONDI I DATI <span>−</span>' : 'MOSTRA I DATI PER IL REGALO <span>+</span>';
  });

  $('#copyIban').addEventListener('click', async () => {
    const iban = 'IT38Y0200816513000421389696';
    try {
      await navigator.clipboard.writeText(iban);
      announce('IBAN copiato negli appunti');
    } catch (_err) {
      announce(`IBAN: ${iban}`);
    }
  });

  const rsvpForm = $('#rsvpForm');
  const attendanceDetails = $('#attendanceDetails');
  const allergyDetails = $('#allergyDetails');
  const allergyLabel = $('#allergyLabel');
  const errorNode = $('#rsvpError');
  const selected = (name) => rsvpForm.querySelector(`input[name="${name}"]:checked`)?.value || '';
  const showError = (message) => {
    errorNode.textContent = message;
    errorNode.hidden = false;
    errorNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  rsvpForm.addEventListener('change', () => {
    errorNode.hidden = true;
    const isPresent = selected('attendance') === 'yes';
    attendanceDetails.hidden = !isPresent;
    const hasAllergy = isPresent && selected('allergy') === 'yes';
    allergyDetails.hidden = !hasAllergy;
    allergyLabel.hidden = !hasAllergy;
  });

  rsvpForm.addEventListener('submit', (event) => {
    event.preventDefault();
    errorNode.hidden = true;
    const name = $('#guestName').value.trim().replace(/\s+/g, ' ');
    const attendance = selected('attendance');
    const menu = selected('menu');
    const allergy = selected('allergy');
    const allergyText = allergyDetails.value.trim();
    if (name.length < 2) return showError('Inserisci il tuo nome e cognome.');
    if (!attendance) return showError('Seleziona se parteciperai al matrimonio.');
    if (attendance === 'yes' && !menu) return showError('Seleziona la preferenza per il menù.');
    if (attendance === 'yes' && !allergy) return showError('Indica se hai allergie o intolleranze.');
    if (attendance === 'yes' && allergy === 'yes' && !allergyText) return showError('Specifica le allergie o intolleranze alimentari.');

    const message = [
      '💍 *RSVP — Matrimonio di Vittoria & Gabriele*',
      '📅 10 giugno 2027',
      '',
      `*Nome e cognome:* ${name}`,
      `*Partecipazione:* ${attendance === 'yes' ? 'Sì, sarò presente 🥂' : 'Purtroppo non potrò esserci'}`,
    ];
    if (attendance === 'yes') {
      message.push(`*Preferenza menù:* ${menu}`);
      message.push(`*Allergie/intolleranze:* ${allergy === 'yes' ? allergyText : 'Nessuna'}`);
    }
    message.push('', 'Grazie! ♡');
    const url = `https://wa.me/393492402586?text=${encodeURIComponent(message.join('\n'))}`;
    // This opens a pre-filled WhatsApp draft; only the guest can press Send.
    window.open(url, '_blank', 'noopener,noreferrer');
    announce('WhatsApp aperto: premi Invia per completare la conferma.');
  });

  // Italian local time: wedding date is 18:00 CEST (UTC+2).
  const weddingDate = new Date('2027-06-10T18:00:00+02:00').getTime();
  const pad = (n) => String(n).padStart(2, '0');
  const updateCountdown = () => {
    const seconds = Math.max(0, Math.floor((weddingDate - Date.now()) / 1000));
    $('#cdDays').textContent = Math.floor(seconds / 86400);
    $('#cdHours').textContent = pad(Math.floor(seconds / 3600) % 24);
    $('#cdMinutes').textContent = pad(Math.floor(seconds / 60) % 60);
    $('#cdSeconds').textContent = pad(seconds % 60);
  };
  updateCountdown();
  setInterval(updateCountdown, 1000);
})();
