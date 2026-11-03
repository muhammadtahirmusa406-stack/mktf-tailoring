import { createWorker } from 'tesseract.js';

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  extractedData: {
    statusText?: string;
    foundAccount?: string;
    foundName?: string;
    foundAmount?: number;
    referenceId?: string;
    dateText?: string;
    rawText: string;
  };
}

export async function verifyBankReceipt(
  imageSource: string | File,
  expectedAccount: string,
  expectedName: string,
  expectedAmount: number
): Promise<VerificationResult> {
  const errors: string[] = [];

  // 1. Run Tesseract OCR on receipt image
  const worker = await createWorker('eng');
  const ret = await worker.recognize(imageSource);
  await worker.terminate();

  const rawText = ret.data.text || '';
  const lowerText = rawText.toLowerCase();

  // -------------------------------------------------------------
  // RULE 1: STRICT TRANSACTION STATUS
  // -------------------------------------------------------------
  const statusSuccess =
    /(?:transaction\s*(?:status|state)?[\s:]*(?:successful|success|completed|approved))|(?:payment\s*(?:status)?[\s:]*(?:successful|success|completed))|\b(successful|completed|transferred\s*successfully)\b/i.test(
      rawText
    );

  const statusPendingOrFailed =
    /\b(failed|declined|unsuccessful|reversed|pending|processing|in-progress|queued|retrying)\b/i.test(
      rawText
    );

  if (!statusSuccess || statusPendingOrFailed) {
    errors.push('Transaction status must be clearly "Successful" or "Completed" (Pending, Failed, or Unconfirmed receipts are rejected).');
  }

  // -------------------------------------------------------------
  // RULE 2: STRICT BENEFICIARY / RECIPIENT NAME
  // -------------------------------------------------------------
  const cleanExpectedName = expectedName.trim().toLowerCase();
  const nameParts = cleanExpectedName
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z0-9]/g, ''))
    .filter((p) => p.length >= 3 && !['ltd', 'limited', 'bank', 'plc', 'enterprise', 'the'].includes(p));

  const matchedNameTokens = nameParts.filter((token) => lowerText.includes(token));
  // Require at least 2 tokens, or all tokens if there's only 1 significant word
  const minRequiredTokens = Math.min(nameParts.length, 2);

  if (matchedNameTokens.length < minRequiredTokens) {
    errors.push(`Beneficiary name mismatch: Receipt must clearly display the recipient account name (${expectedName}).`);
  }

  // -------------------------------------------------------------
  // RULE 3: STRICT ACCOUNT NUMBER
  // -------------------------------------------------------------
  const cleanAccount = expectedAccount.replace(/[^0-9]/g, '');
  const first3 = cleanAccount.slice(0, 3);
  const last3 = cleanAccount.slice(-3);

  const hasFullAccount = cleanAccount.length >= 9 && rawText.replace(/[\s-]/g, '').includes(cleanAccount);
  const hasMaskedAccount = new RegExp(`\\b${first3}[0-9*xX\\s-]{3,10}${last3}\\b`).test(rawText);

  if (!hasFullAccount && !hasMaskedAccount) {
    errors.push(`Beneficiary account mismatch: Must be sent to account ending with ...${last3} (${expectedAccount}).`);
  }

  // -------------------------------------------------------------
  // RULE 4: STRICT AMOUNT (TARGETS AMOUNT LABELS & CURRENCY)
  // -------------------------------------------------------------
  // Look specifically for amount labeled sections first: "Amount", "Total", "Paid", "NGN", "₦"
    // Matches currency symbol or amount prefix followed by digits (from 1 to 999,999,999.00)
  const amountRegex = /(?:amount|amt|transferred|paid|total)?[\s:]*(?:ngn|ng|n|₦)?[\s]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;
  
  let foundAmount: number | undefined;
  let matches: RegExpExecArray | null;

  while ((matches = amountRegex.exec(rawText)) !== null) {
    const rawValStr = matches[1].replace(/,/g, '');
    const val = parseFloat(rawValStr);
    // Ignore 10-digit account numbers or long references accidentally matched
    if (val.toString().length > 7) continue;

    // STRICT EXACT MATCH: Must match required amount exactly (tolerance of 0.01 for rounding)
    if (!isNaN(val) && Math.abs(val - expectedAmount) <= 0.01) {
      foundAmount = val;
      break;
    }
  }

  if (foundAmount === undefined) {
    errors.push(`Amount check failed: The receipt amount must be EXACTLY ₦${expectedAmount.toLocaleString()}. Discrepancies or different sums are rejected.`);
  }

  // -------------------------------------------------------------
  // RULE 5: STRICT DATE (MUST BE TODAY'S EXACT DATE - TIME IGNORED)
  // -------------------------------------------------------------
  const now = new Date();
  // Format target date parts in Nigerian context
  const todayDay = String(now.getDate()).padStart(2, '0');
  const todayDayShort = String(now.getDate());
  const todayMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const todayMonthShortNum = String(now.getMonth() + 1);
  const todayYearFull = String(now.getFullYear());
  const todayYearShort = todayYearFull.slice(-2);
  
  const monthNamesShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthNamesLong = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const curMonthShort = monthNamesShort[now.getMonth()];
  const curMonthLong = monthNamesLong[now.getMonth()];

  // Candidate exact-match patterns for today (e.g., "03/11/2026", "3/11/2026", "03-11-2026", "03 Nov 2026", "November 3, 2026")
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    new RegExp(`\\b0?${todayDayShort}[-\\/.\\s]0?${todayMonthShortNum}[-\\/.\\s](?:${todayYearFull}|${todayYearShort})\\b`, 'i'),
    // YYYY-MM-DD
    new RegExp(`\\b${todayYearFull}[-\\/.\\s]0?${todayMonthShortNum}[-\\/.\\s]0?${todayDayShort}\\b`, 'i'),
    // 03 Nov 2026, 3rd Nov 2026, 3 November 2026
    new RegExp(`\\b0?${todayDayShort}(?:st|nd|rd|th)?[-\\s]+(?:${curMonthShort}|${curMonthLong})[-\\s,]+(?:${todayYearFull}|${todayYearShort})\\b`, 'i'),
    // Nov 03, 2026 or Nov 3rd, 2026 or November 3rd, 2026
    new RegExp(`\\b(?:${curMonthShort}|${curMonthLong})[-\\s]+0?${todayDayShort}(?:st|nd|rd|th)?[-\\s,]+(?:${todayYearFull}|${todayYearShort})\\b`, 'i'),
  ];

  let isDateValid = false;
  let detectedDateStr: string | undefined;

  for (const pattern of datePatterns) {
    const match = rawText.match(pattern);
    if (match) {
      isDateValid = true;
      detectedDateStr = match[0];
      break;
    }
  }

  // Backup check: Ensure receipt text contains today's day number, current month name, and current year anywhere together
  if (!isDateValid) {
    const hasYear = lowerText.includes(todayYearFull) || lowerText.includes(`/${todayYearShort}`);
    const hasMonth = lowerText.includes(curMonthShort) || lowerText.includes(curMonthLong) || lowerText.includes(`/${todayMonthNum}/`) || lowerText.includes(`-${todayMonthNum}-`);
    const hasDay = new RegExp(`\\b0?${todayDayShort}\\b`).test(rawText);

    if (hasYear && hasMonth && hasDay) {
      isDateValid = true;
      detectedDateStr = `${todayDay}/${todayMonthNum}/${todayYearFull}`;
    }
  }

  if (!isDateValid) {
    errors.push(`Receipt date mismatch: The transfer must be completed TODAY (${todayDay}/${todayMonthNum}/${todayYearFull}). Previous or future dated receipts are strictly rejected.`);
  }

  // RULE 6: STRICT SESSION / TRANSACTION REFERENCE ID (NO MOCKS)
  // -------------------------------------------------------------
  const refRegex = /(?:session\s*id|ref(?:erence)?(?:\s*no|\s*id)?|txn\s*id|transaction\s*id)[\s:]*([A-Za-z0-9_\-\.\/]{10,40})/i;
  const refMatch = rawText.match(refRegex);
  let referenceId: string | undefined;

  if (refMatch && refMatch[1]) {
    referenceId = refMatch[1].trim();
  } else {
    // Look for standard Nigerian banking 30-digit NIP session IDs
    const standaloneSessionId = rawText.match(/\b\d{20,35}\b/);
    if (standaloneSessionId) {
      referenceId = standaloneSessionId[0];
    }
  }

  if (!referenceId) {
    errors.push('Transaction Reference / Session ID not detected. Please upload a clear official transfer receipt.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    extractedData: {
      statusText: statusSuccess ? 'Successful' : 'Unconfirmed',
      foundAccount: hasFullAccount || hasMaskedAccount ? expectedAccount : undefined,
      foundName: matchedNameTokens.join(' ') || undefined,
      foundAmount,
      referenceId,
      dateText: detectedDateStr,
      rawText,
    },
  };
}
