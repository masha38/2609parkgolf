const SHEET_NAME = '상담신청';
const HEADER_ROW = 4;
const HEADERS = [
  '접수일시', '리드ID', '상태', '희망상품코드', '희망상품명', '이름', '연락처', '개인정보동의',
  'UTM소스', 'UTM매체', 'UTM캠페인', 'UTM콘텐츠', 'UTM키워드', '페이지URL', '이전페이지',
  '사용자환경', '처리담당자', '상담결과', '메모', '최종수정일'
];

const TOUR_NAMES = {
  cruise: '9월 1일 크루즈 파크골프 4박 5일',
  air: '9월 14일 항공 파크골프 3박 4일',
  compare: '두 상품 비교 상담'
};

const STATUS_VALUES = ['신규', '상담중', '예약완료', '보류', '취소'];

/**
 * 최초 1회 실행합니다.
 * 구글시트에 연결된 Apps Script에서 실행하면 시트 ID 저장과 컬럼 설정을 함께 처리합니다.
 */
function setupProject() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('구글시트에서 확장 프로그램 > Apps Script로 열어 실행해 주세요.');
  }

  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  const sheet = ensureSheet_(spreadsheet, true);
  sheet.activate();
  spreadsheet.toast('상담 신청 시트 설정이 완료되었습니다.', '위해 파크골프');
}

/** 웹 앱 상태 확인용 */
function doGet() {
  return jsonOutput_({ ok: true, service: 'weihai-parkgolf-lead-form' });
}

/** 랜딩페이지 상담 폼 수신 */
function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    const payload = parsePayload_(e);

    // 화면에는 보이지 않는 필드입니다. 값이 있으면 자동 입력으로 보고 저장하지 않습니다.
    if (clean_(payload.website, 100)) {
      return jsonOutput_({ ok: true });
    }

    const lead = validateAndNormalize_(payload);
    if (isRapidDuplicate_(lead.phone, lead.tour)) {
      throw new Error('같은 상담 신청이 이미 전송되었습니다. 잠시 후 다시 시도해 주세요.');
    }

    const spreadsheet = getSpreadsheet_();
    const sheet = ensureSheet_(spreadsheet);
    const now = new Date();
    const leadId = Utilities.getUuid();
    const row = [
      now,
      leadId,
      '신규',
      lead.tour,
      TOUR_NAMES[lead.tour],
      lead.name,
      lead.phone,
      true,
      clean_(payload.utm_source, 100),
      clean_(payload.utm_medium, 100),
      clean_(payload.utm_campaign, 150),
      clean_(payload.utm_content, 150),
      clean_(payload.utm_term, 150),
      safeUrl_(payload.page_url),
      safeUrl_(payload.referrer),
      clean_(payload.user_agent, 500),
      '',
      '',
      '',
      now
    ];

    const rowNumber = Math.max(sheet.getLastRow() + 1, HEADER_ROW + 1);
    sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([row]);
    formatNewRow_(sheet, rowNumber);
    SpreadsheetApp.flush();
    rememberSubmission_(lead.phone, lead.tour);

    return jsonOutput_({ ok: true, leadId: leadId });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonOutput_({ ok: false, message: error.message || '상담 신청 저장 중 오류가 발생했습니다.' });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function getSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID가 없습니다. setupProject 함수를 먼저 실행해 주세요.');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function ensureSheet_(spreadsheet, forceSetup) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);

  const currentHeaders = sheet.getRange(HEADER_ROW, 1, 1, HEADERS.length).getDisplayValues()[0];
  const isConfigured = currentHeaders.join('|') === HEADERS.join('|');
  if (isConfigured && !forceSetup) return sheet;

  sheet.getRange(1, 1, 2, HEADERS.length).breakApart();
  sheet.getRange(1, 1, 1, HEADERS.length).mergeAcross();
  sheet.getRange(1, 1).setValue('위해 파크골프 상담 신청 관리');
  sheet.getRange(2, 1, 1, HEADERS.length).mergeAcross();
  sheet.getRange(2, 1).setValue('랜딩페이지에서 접수된 상담이 5행부터 자동으로 추가됩니다.');
  sheet.getRange(HEADER_ROW, 1, 1, HEADERS.length).setValues([HEADERS]);

  sheet.setFrozenRows(HEADER_ROW);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground('#073D2B').setFontColor('#FFFFFF').setFontWeight('bold').setFontSize(16);
  sheet.getRange(2, 1, 1, HEADERS.length)
    .setBackground('#EAF2EC').setFontColor('#51605A').setFontSize(10);
  sheet.getRange(HEADER_ROW, 1, 1, HEADERS.length)
    .setBackground('#D7EB78').setFontColor('#073D2B').setFontWeight('bold')
    .setHorizontalAlignment('center').setWrap(true);

  const minimumRows = Math.max(sheet.getMaxRows(), 200);
  if (sheet.getMaxRows() < minimumRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), minimumRows - sheet.getMaxRows());
  }
  sheet.getRange(HEADER_ROW + 1, 3, sheet.getMaxRows() - HEADER_ROW, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUS_VALUES, true).build());
  sheet.getRange(HEADER_ROW + 1, 4, sheet.getMaxRows() - HEADER_ROW, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(TOUR_NAMES), true).build());
  sheet.getRange(HEADER_ROW + 1, 7, sheet.getMaxRows() - HEADER_ROW, 1).setNumberFormat('@');
  sheet.getRange(HEADER_ROW + 1, 1, sheet.getMaxRows() - HEADER_ROW, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sheet.getRange(HEADER_ROW + 1, 20, sheet.getMaxRows() - HEADER_ROW, 1).setNumberFormat('yyyy-mm-dd hh:mm');

  return sheet;
}

function formatNewRow_(sheet, rowNumber) {
  sheet.getRange(rowNumber, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sheet.getRange(rowNumber, 7).setNumberFormat('@');
  sheet.getRange(rowNumber, 20).setNumberFormat('yyyy-mm-dd hh:mm');
  sheet.getRange(rowNumber, 1, 1, HEADERS.length).setVerticalAlignment('middle').setWrap(true);
}

function parsePayload_(e) {
  if (!e) throw new Error('요청 데이터가 없습니다.');

  const body = e.postData && e.postData.contents ? e.postData.contents : '';
  if (body) {
    try { return JSON.parse(body); } catch (ignore) {}
  }
  return e.parameter || {};
}

function validateAndNormalize_(payload) {
  const tour = clean_(payload.tour, 20);
  const name = clean_(payload.name, 30);
  const phoneDigits = String(payload.phone || '').replace(/\D/g, '');
  const privacy = payload.privacy === true || payload.privacy === 'true' || payload.privacy === 'on' || payload.privacy === '1';

  if (!TOUR_NAMES[tour]) throw new Error('희망 상품을 선택해 주세요.');
  if (name.length < 2) throw new Error('이름을 두 글자 이상 입력해 주세요.');
  if (!/^01[016789]\d{7,8}$/.test(phoneDigits)) throw new Error('휴대전화 번호를 확인해 주세요.');
  if (!privacy) throw new Error('개인정보 수집·이용 동의가 필요합니다.');

  return { tour: tour, name: name, phone: formatPhone_(phoneDigits) };
}

function duplicateKey_(phone, tour) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, phone + ':' + tour);
  return 'lead_' + Utilities.base64EncodeWebSafe(digest).slice(0, 32);
}

function isRapidDuplicate_(phone, tour) {
  return Boolean(CacheService.getScriptCache().get(duplicateKey_(phone, tour)));
}

function rememberSubmission_(phone, tour) {
  CacheService.getScriptCache().put(duplicateKey_(phone, tour), '1', 120);
}

function clean_(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function safeUrl_(value) {
  const url = clean_(value, 1000);
  return /^(https?:\/\/|file:\/\/)/i.test(url) ? url : '';
}

function formatPhone_(digits) {
  if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
}

function jsonOutput_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
