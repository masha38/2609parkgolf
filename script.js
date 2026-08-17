const config = window.PARKGOLF_CONFIG || {};
const header = document.querySelector('.site-header');
const form = document.querySelector('#consult-form');
const privacy = form.querySelector('input[name="privacy"]');
const phoneInput = form.querySelector('input[name="phone"]');
const submitButton = form.querySelector('button[type="submit"]');
const message = document.querySelector('#form-message');

function track(eventName, data = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...data });
}

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 40);
}

function selectedTour() {
  return form.querySelector('input[name="tour"]:checked');
}

function updateSubmitState() {
  const tour = selectedTour();
  submitButton.disabled = !(tour && privacy.checked);

  if (!tour) submitButton.textContent = '상담 신청하기';
  else if (tour.value === 'cruise') submitButton.textContent = '9월 1일 크루즈 상담 신청';
  else if (tour.value === 'air') submitButton.textContent = '9월 14일 항공 상담 신청';
  else submitButton.textContent = '두 상품 비교 상담 신청';
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function setCampaignFields() {
  const params = new URLSearchParams(window.location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((name) => {
    const field = form.querySelector(`[name="${name}"]`);
    if (field) field.value = params.get(name) || '';
  });
  form.querySelector('[name="page_url"]').value = window.location.href;
  form.querySelector('[name="referrer"]').value = document.referrer || '';
  form.querySelector('[name="user_agent"]').value = navigator.userAgent || '';
}

function configureKakaoLinks() {
  document.querySelectorAll('[data-kakao-link]').forEach((link) => {
    if (config.kakaoUrl) {
      link.href = config.kakaoUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.setAttribute('aria-label', '카카오톡 상담 열기');
    }
  });
}

document.querySelectorAll('.select-product').forEach((button) => {
  button.addEventListener('click', () => {
    const option = form.querySelector(`input[value="${button.dataset.product}"]`);
    option.checked = true;
    updateSubmitState();
    track('tour_select', { tour: button.dataset.product });
    document.querySelector('#consult').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => option.focus(), 500);
  });
});

document.querySelectorAll('[data-track]').forEach((element) => {
  element.addEventListener('click', () => track('cta_click', { location: element.dataset.track }));
});

phoneInput.addEventListener('input', () => {
  phoneInput.value = formatPhone(phoneInput.value);
});

form.addEventListener('change', updateSubmitState);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.classList.remove('error');

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (!config.formEndpoint) {
    message.textContent = `온라인 접수 주소 연결이 필요합니다. 현재는 ${config.contactPhone || '대표번호'}로 문의해 주세요.`;
    message.classList.add('error');
    track('lead_blocked_no_endpoint', { tour: selectedTour()?.value });
    return;
  }

  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = '접수 중입니다…';

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    await fetch(config.formEndpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      keepalive: true
    });

    message.textContent = '상담 신청이 전송되었습니다. 담당자가 확인 후 연락드리겠습니다.';
    track('lead_submit', { tour: payload.tour });
    form.reset();
  } catch {
    message.textContent = `접수 중 문제가 발생했습니다. ${config.contactPhone || '대표번호'}로 문의해 주세요.`;
    message.classList.add('error');
    track('lead_submit_error', { tour: selectedTour()?.value });
  } finally {
    submitButton.textContent = originalText;
    updateSubmitState();
  }
});

function enableRevealMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.needs-grid article, .story-card, .departure-brief, .important-grid article, .booking-steps li');
  targets.forEach((target) => target.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach((target) => observer.observe(target));
}

window.addEventListener('scroll', updateHeader, { passive: true });
setCampaignFields();
configureKakaoLinks();
enableRevealMotion();
updateHeader();
updateSubmitState();
