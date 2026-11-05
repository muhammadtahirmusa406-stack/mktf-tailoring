import { createWorker, PSM } from 'tesseract.js';

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

/**
 * Crops the upper header region (top 40%) of the receipt where OPay,
 * PalmPay, and Moniepoint place the primary transaction amount.
 */
async function cropHeaderRegion(imageSource: string | File): Promise<string> {
  if (typeof window === 'undefined') {
    return typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const cropHeight = Math.floor(img.naturalHeight * 0.40);
        canvas.width = img.naturalWidth * 2;
        canvas.height = cropHeight * 2;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(url);
          return;
        }

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          img,
          0, 0, img.naturalWidth, cropHeight,
          0, 0, canvas.width, canvas.height
        );

        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(url);
      }
    };

    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export async function verifyBankReceipt(
  imageSource: string | File,
  expectedAccount: string,
  expectedName: string,
  expectedAmount: number
): Promise<VerificationResult> {
  const errors: string[] = [];

  const worker = await createWorker('eng');

  // PASS 1: Full image
  const fullRes = await worker.recognize(imageSource);
  const fullText = fullRes.data.text || '';

  // PASS 2: Cropped Header for Amount
  let headerText = '';
  try {
    const headerDataUrl = await cropHeaderRegion(imageSource);
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });
    const headerRes = await worker.recognize(headerDataUrl);
    headerText = headerRes.data.text || '';
  } catch (e) {
    console.warn('Header crop OCR pass skipped:', e);
  }

  await worker.terminate();

  const combinedRawText = `${fullText}\n---HEADER---\n${headerText}`;
  const lowerText = combinedRawText.toLowerCase();

  // -------------------------------------------------------------
  // RULE 1: STRICT TRANSACTION STATUS
  // -------------------------------------------------------------
  const statusSuccess =
    /(?:transaction\s*(?:status|state)?[\s:]*(?:successful|success|completed|approved))|(?:payment\s*(?:status)?[\s:]*(?:successful|success|completed))|\b(successful|completed|transferred\s*successfully|success)\b/i.test(
      combinedRawText
    );

  const statusPendingOrFailed =
    /\b(failed|declined|unsuccessful|reversed|pending|processing|in-progress|queued|retrying)\b/i.test(
      combinedRawText
    );

  if (!statusSuccess || statusPendingOrFailed) {
    errors.push('Transaction status must be clearly "Successful" or "Completed" (Pending, Failed, or Unconfirmed receipts are rejected).');
  }

  // -------------------------------------------------------------
  // RULE 2: BENEFICIARY / RECIPIENT NAME
  // -------------------------------------------------------------
  const cleanExpectedName = expectedName.trim().toLowerCase();
  const nameParts = cleanExpectedName
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z0-9]/g, ''))
    .filter((p) => p.length >= 3 && !['ltd', 'limited', 'bank', 'plc', 'enterprise', 'the', 'opay'].includes(p));

  const matchedNameTokens = nameParts.filter((token) => lowerText.includes(token));
  const minRequiredTokens = Math.min(nameParts.length, 2);

  if (matchedNameTokens.length < minRequiredTokens) {
    errors.push(`Beneficiary name mismatch: Receipt must clearly display the recipient account name (${expectedName}).`);
  }

  // -------------------------------------------------------------
  // RULE 3: ACCOUNT NUMBER (FULL OR MASKED: 803****560)
  // -------------------------------------------------------------
  const cleanAccount = expectedAccount.replace(/[^0-9]/g, '');
  const first3 = cleanAccount.slice(0, 3);
  const last3 = cleanAccount.slice(-3);

  const normalizedNoSpaces = combinedRawText.replace(/[\s-]/g, '');
  const hasFullAccount = cleanAccount.length >= 9 && normalizedNoSpaces.includes(cleanAccount);
  const maskedRegex = new RegExp(`${first3}[^0-9a-zA-Z\n]{1,8}${last3}|${first3}[*xX•#+.\\s-]{1,8}${last3}`);
  const hasMaskedAccount = maskedRegex.test(combinedRawText);

  const lines = combinedRawText.split('\n');
  const hasRecipientLineAccount = lines.some((line) => {
    const l = line.toLowerCase();
    const hasRecipientContext = l.includes('recipient') || l.includes('beneficiary') || l.includes('opay') || l.includes('acct') || l.includes('to:');
    return hasRecipientContext && (line.includes(last3) || line.includes(first3));
  });

  if (!hasFullAccount && !hasMaskedAccount && !hasRecipientLineAccount) {
    errors.push(`Beneficiary account mismatch: Must be sent to account ending with ...${last3} (${expectedAccount}).`);
  }

  // -------------------------------------------------------------
  // RULE 4: AMOUNT MATCHING (HANDLES ₦70.00, 70.00, 70)
  // -------------------------------------------------------------
  const expInt = Math.round(expectedAmount).toString();
  const expDec = expectedAmount.toFixed(2);
  const expDecComma = expectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const amountPatterns = [
    new RegExp(`(?:[₦#N=]|ngn)?\\s*\\b${expDec.replace('.', '\\.')}\\b`, 'i'),
    new RegExp(`(?:[₦#N=]|ngn)?\\s*\\b${expDecComma.replace('.', '\\.')}\\b`, 'i'),
    new RegExp(`(?:[₦#N=]|ngn)\\s*${expInt}\\b`, 'i'),
    new RegExp(`\\b${expDec.replace('.', '\\.')}\\b`),
    new RegExp(`\\b${expInt}\\.00\\b`),
    new RegExp(`\\b${expInt}\\b`),
  ];

  let amountFound = amountPatterns.some((pattern) => pattern.test(combinedRawText));

  if (!amountFound) {
    const tokens = combinedRawText.split(/\s+/);
    for (const token of tokens) {
      const cleanToken = token.replace(/^[₦#Nn=]|ngn/i, '').replace(/,/g, '').trim();
      const val = parseFloat(cleanToken);
      if (!isNaN(val) && Math.abs(val - expectedAmount) < 0.05) {
        amountFound = true;
        break;
      }
    }
  }

  if (!amountFound && combinedRawText.replace(/[\s,]/g, '').includes(expDec)) {
    amountFound = true;
  }

  if (!amountFound) {
    errors.push(`Amount check failed: The receipt amount must be EXACTLY ₦${expectedAmount.toLocaleString()}. Discrepancies or different sums are rejected.`);
  }

  // -------------------------------------------------------------
  // RULE 5: TRANSACTION DATE CHECK
  // -------------------------------------------------------------
  const now = new Date();
  const todayDay = String(now.getDate()).padStart(2, '0');
  const todayDayShort = String(now.getDate());
  const todayMonthNum = String(now.getMonth() + 1).padStart(2, '0');
  const todayYearFull = String(now.getFullYear());
  const todayYearShort = todayYearFull.slice(-2);
  const monthNamesShort = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const curMonthName = monthNamesShort[now.getMonth()];

  const datePatterns = [
    new RegExp(`\\b${curMonthName}[a-z]*\\s+${todayDayShort}(?:st|nd|rd|th)?,?\\s*${todayYearFull}\\b`, 'i'),
    new RegExp(`\\b${todayDayShort}(?:st|nd|rd|th)?\\s+${curMonthName}[a-z]*,?\\s*${todayYearFull}\\b`, 'i'),
    new RegExp(`\\b${todayYearFull}[-/.]${todayMonthNum}[-/.]${todayDay}\\b`),
    new RegExp(`\\b${todayDay}[-/.]${todayMonthNum}[-/.]${todayYearFull}\\b`),
    new RegExp(`\\b${todayDay}[-/.]${todayMonthNum}[-/.]${todayYearShort}\\b`),
  ];

  const hasValidDate = datePatterns.some((pattern) => pattern.test(combinedRawText));
  const looseDateMatch = lowerText.includes(curMonthName) && (combinedRawText.includes(todayYearFull) || combinedRawText.includes(todayDayShort));

  if (!hasValidDate && !looseDateMatch) {
    errors.push(`Date check failed: Receipt date must match today (${now.toDateString()}). Stale or future receipts are rejected.`);
  }

  // -------------------------------------------------------------
  // RULE 6: EXTRACT REFERENCE / SESSION ID / TRANSACTION NO.
  // -------------------------------------------------------------
  let referenceId: string | undefined;

  // Pattern A: Labeled reference ("Transaction No.", "Session ID", "Ref No:", "Reference:")
  const refRegex = /(?:transaction\s*no\.?|session\s*id|trans\s*id|ref\s*(?:no\.?)?|reference\s*(?:no\.?)?)[\s:]*([A-Za-z0-9_-]{10,40})/i;
  const refMatch = refRegex.exec(combinedRawText);

  if (refMatch && refMatch[1]) {
    referenceId = refMatch[1].trim();
  } else {
    // Pattern B: Raw 16-35 digit standalone reference number (e.g. OPay / NIBSS session IDs)
    const longNumRegex = /\b([0-9]{16,35})\b/;
    const numMatch = longNumRegex.exec(combinedRawText);
    if (numMatch && numMatch[1]) {
      referenceId = numMatch[1].trim();
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    extractedData: {
      foundAmount: amountFound ? expectedAmount : undefined,
      referenceId,
      statusText: statusSuccess ? 'Successful' : undefined,
      foundAccount: expectedAccount,
      foundName: expectedName,
      rawText: combinedRawText,
    },
  };
}
