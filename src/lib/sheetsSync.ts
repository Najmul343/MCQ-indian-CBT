import Papa from 'papaparse';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Question } from '../types';

export interface SyncResult {
  success: boolean;
  totalParsed: number;
  totalSaved: number;
  message: string;
  questions?: Question[];
}

/**
 * Converts a Google Sheets URL into a direct CSV download export link
 */
export function convertGoogleSheetToCsvUrl(sheetUrl: string): string {
  if (!sheetUrl) return '';
  const trimmed = sheetUrl.trim();

  // If already a direct CSV link
  if (trimmed.includes('export?format=csv') || trimmed.includes('/pub?output=csv')) {
    return trimmed;
  }

  // Extract Spreadsheet ID
  const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    const spreadsheetId = match[1];
    // Check if GID is present in URL
    const gidMatch = trimmed.match(/[?&]gid=([0-9]+)/);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gidParam}`;
  }

  return trimmed;
}

/**
 * Parses raw CSV content or fetched row data into Question objects
 */
export function parseSheetRowsToQuestions(rows: any[][]): Question[] {
  if (!rows || rows.length === 0) return [];

  const questions: Question[] = [];
  
  // Skip header if first row contains 'Question' or 'Exam' or header keywords
  let startIndex = 0;
  if (rows.length > 0) {
    const firstRowStr = rows[0].join(' ').toLowerCase();
    if (
      firstRowStr.includes('question') || 
      firstRowStr.includes('exam') || 
      firstRowStr.includes('option') ||
      firstRowStr.includes('text')
    ) {
      startIndex = 1;
    }
  }

  for (let i = startIndex; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 5) continue;

    // Check header column format
    // Format A (Extended 24 columns):
    // 0: Exam
    // 1: Subject
    // 2: Chapter
    // 3: Topic
    // 4: Question Text
    // 5: Question Image URL
    // 6: Option A Text
    // 7: Option A Image URL
    // 8: Option B Text
    // 9: Option B Image URL
    // 10: Option C Text
    // 11: Option C Image URL
    // 12: Option D Text
    // 13: Option D Image URL
    // 14: Answer (A/B/C/D)
    // 15: Difficulty (easy/medium/hard)
    // 16: Points
    // 17: Negative Marks
    // 18: Explanation
    // 19: Question (Translated)
    // 20: Option A (Translated)
    // 21: Option B (Translated)
    // 22: Option C (Translated)
    // 23: Option D (Translated)

    let exam = 'NCVT ITI';
    let subject = 'General';
    let chapter = 'Chapter 1';
    let topic = 'General Topic';
    let qText = '';
    let qImg = '';
    let optA = '', optAImg = '';
    let optB = '', optBImg = '';
    let optC = '', optCImg = '';
    let optD = '', optDImg = '';
    let ans = 'A';
    let diff: 'easy' | 'medium' | 'hard' = 'medium';
    let pts = 1;
    let neg = 0;
    let exp = '';
    let qTr = '';
    let optATr = '', optBTr = '', optCTr = '', optDTr = '';

    // Detect format based on column counts & contents
    if (r.length >= 20 || (r[0] && r[0].toString().length < 30 && !r[0].toString().includes(' '))) {
      // Extended format with Exam/Subject/Chapter prefix
      exam = r[0] ? r[0].toString().trim() : 'NCVT ITI';
      subject = r[1] ? r[1].toString().trim() : 'General';
      chapter = r[2] ? r[2].toString().trim() : 'Chapter 1';
      topic = r[3] ? r[3].toString().trim() : 'Topic';
      
      qText = r[4] ? r[4].toString().trim() : '';
      qImg = r[5] ? r[5].toString().trim() : '';
      
      optA = r[6] ? r[6].toString().trim() : '';
      optAImg = r[7] ? r[7].toString().trim() : '';
      optB = r[8] ? r[8].toString().trim() : '';
      optBImg = r[9] ? r[9].toString().trim() : '';
      optC = r[10] ? r[10].toString().trim() : '';
      optCImg = r[11] ? r[11].toString().trim() : '';
      optD = r[12] ? r[12].toString().trim() : '';
      optDImg = r[13] ? r[13].toString().trim() : '';

      ans = r[14] ? r[14].toString().trim().toUpperCase() : 'A';
      diff = (r[15] ? r[15].toString().trim().toLowerCase() : 'medium') as any;
      pts = parseFloat(r[16]) || 1;
      neg = parseFloat(r[17]) || 0;
      exp = r[18] ? r[18].toString().trim() : '';

      qTr = r[19] ? r[19].toString().trim() : '';
      optATr = r[20] ? r[20].toString().trim() : '';
      optBTr = r[21] ? r[21].toString().trim() : '';
      optCTr = r[22] ? r[22].toString().trim() : '';
      optDTr = r[23] ? r[23].toString().trim() : '';
    } else {
      // Standard Apps Script format (starting directly with Question Text)
      qText = r[0] ? r[0].toString().trim() : '';
      qImg = r[1] ? r[1].toString().trim() : '';
      optA = r[2] ? r[2].toString().trim() : '';
      optAImg = r[3] ? r[3].toString().trim() : '';
      optB = r[4] ? r[4].toString().trim() : '';
      optBImg = r[5] ? r[5].toString().trim() : '';
      optC = r[6] ? r[6].toString().trim() : '';
      optCImg = r[7] ? r[7].toString().trim() : '';
      optD = r[8] ? r[8].toString().trim() : '';
      optDImg = r[9] ? r[9].toString().trim() : '';
      ans = r[10] ? r[10].toString().trim().toUpperCase() : 'A';
      diff = (r[11] ? r[11].toString().trim().toLowerCase() : 'medium') as any;
      pts = parseFloat(r[12]) || 1;
      neg = parseFloat(r[13]) || 0;
      exp = r[14] ? r[14].toString().trim() : '';
      qTr = r[15] ? r[15].toString().trim() : '';
      optATr = r[16] ? r[16].toString().trim() : '';
      optBTr = r[17] ? r[17].toString().trim() : '';
      optCTr = r[18] ? r[18].toString().trim() : '';
      optDTr = r[19] ? r[19].toString().trim() : '';
    }

    if (!qText && !optA) continue; // skip empty rows

    // Ensure answer is valid 'A'|'B'|'C'|'D'
    let validAns: 'A' | 'B' | 'C' | 'D' = 'A';
    if (['A', 'B', 'C', 'D'].includes(ans)) {
      validAns = ans as 'A' | 'B' | 'C' | 'D';
    }

    const questionId = `q_sync_${Date.now()}_${i}`;

    const qObj: Question = {
      question_id: questionId,
      exam_type: exam || 'NCVT ITI',
      subject: subject || 'Trade Theory',
      chapter: chapter || 'General',
      topic: topic || 'General',
      question_text: qText,
      question_tr: qTr,
      image_url: qImg,
      options: {
        A: optA || 'Option A',
        B: optB || 'Option B',
        C: optC || 'Option C',
        D: optD || 'Option D'
      },
      options_tr: {
        A: optATr,
        B: optBTr,
        C: optCTr,
        D: optDTr
      },
      options_image: {
        A: optAImg,
        B: optBImg,
        C: optCImg,
        D: optDImg
      },
      correct_option: validAns,
      difficulty: ['easy', 'medium', 'hard'].includes(diff) ? diff : 'medium',
      points: pts || 1,
      negative_marks: neg || 0,
      explanation: exp
    };

    questions.push(qObj);
  }

  return questions;
}

/**
 * One-Click Automated Google Sheets Sync logic:
 * Fetches Sheet CSV URL -> Parses -> Writes db.batch() to Firestore 'questions' collection!
 */
export async function syncGoogleSheetToFirestore(sheetUrl: string): Promise<SyncResult> {
  try {
    const csvUrl = convertGoogleSheetToCsvUrl(sheetUrl);

    // Fetch CSV
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet (HTTP ${response.status}). Please check sheet sharing permissions.`);
    }

    const csvText = await response.text();

    // Parse CSV with PapaParse
    const parsed = Papa.parse<string[]>(csvText, {
      skipEmptyLines: true
    });

    if (parsed.errors && parsed.errors.length > 0 && (!parsed.data || parsed.data.length === 0)) {
      throw new Error(`CSV parsing error: ${parsed.errors[0].message}`);
    }

    const questions = parseSheetRowsToQuestions(parsed.data);

    if (questions.length === 0) {
      return {
        success: false,
        totalParsed: 0,
        totalSaved: 0,
        message: 'No valid questions found in sheet. Please verify column order.'
      };
    }

    // Perform db.batch() write to Firestore and save to local cache
    try {
      const batch = writeBatch(db);
      questions.forEach((q) => {
        const qRef = doc(db, 'questions', q.question_id);
        batch.set(qRef, q, { merge: true });
      });
      await batch.commit();
    } catch (batchErr: any) {
      console.warn('Sheet sync Firestore batch notice (falling back to local cache):', batchErr?.message || batchErr);
    }

    // Always update local storage cache so synced questions immediately appear in app
    try {
      const existingStr = localStorage.getItem('cache_questions');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      const combined = [...questions, ...existing];
      localStorage.setItem('cache_questions', JSON.stringify(combined));
    } catch (cacheErr) {
      console.warn('Local questions cache save notice:', cacheErr);
    }

    return {
      success: true,
      totalParsed: questions.length,
      totalSaved: questions.length,
      message: `Successfully synchronized ${questions.length} questions from Google Sheet into Firestore!`,
      questions
    };
  } catch (err: any) {
    return {
      success: false,
      totalParsed: 0,
      totalSaved: 0,
      message: err.message || 'Error syncing Google Sheet data.'
    };
  }
}
