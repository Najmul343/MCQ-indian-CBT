import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { safeSetDoc } from '../lib/firebase';
import { Question, QuestionFolder } from '../types';
import { convertGoogleDriveUrl } from '../lib/driveUtils';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download, 
  FolderCheck,
  Sparkles,
  HelpCircle,
  FileCheck2,
  Globe,
  Image as ImageIcon
} from 'lucide-react';

interface ExcelQuestionUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFolderId: string | null;
  targetFolderName: string;
  folders: QuestionFolder[];
  onUploadSuccess: () => void;
}

export const ExcelQuestionUploaderModal: React.FC<ExcelQuestionUploaderModalProps> = ({
  isOpen,
  onClose,
  targetFolderId,
  targetFolderName,
  folders,
  onUploadSuccess
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>(targetFolderId || 'root');
  const [loading, setLoading] = useState<boolean>(false);
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  // Process raw rows array into Question objects
  const processRowsToQuestions = (rows: any[], folderIdToUse: string): Question[] => {
    const questions: Question[] = [];

    rows.forEach((row: any, idx: number) => {
      // Find keys in case insensitive manner
      const getVal = (...possibleKeys: string[]) => {
        for (const key of possibleKeys) {
          const matchedKey = Object.keys(row).find(
            (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, '')
          );
          if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
            return String(row[matchedKey]).trim();
          }
        }
        return '';
      };

      // Exact 24 Columns (A to X) matching user specification
      const qText = getVal('Question Text', 'question_text', 'question', 'qtext');
      const qImgRaw = getVal('Question Image URL', 'question_image_url', 'question_image', 'image_url', 'question_img');

      const optA = getVal('Option A Text', 'option_a_text', 'option_a', 'opta');
      const optAImgRaw = getVal('Option A Image URL', 'option_a_image_url', 'option_a_image', 'opta_img');

      const optB = getVal('Option B Text', 'option_b_text', 'option_b', 'optb');
      const optBImgRaw = getVal('Option B Image URL', 'option_b_image_url', 'option_b_image', 'optb_img');

      const optC = getVal('Option C Text', 'option_c_text', 'option_c', 'optc');
      const optCImgRaw = getVal('Option C Image URL', 'option_c_image_url', 'option_c_image', 'optc_img');

      const optD = getVal('Option D Text', 'option_d_text', 'option_d', 'optd');
      const optDImgRaw = getVal('Option D Image URL', 'option_d_image_url', 'option_d_image', 'optd_img');

      const rawAns = getVal('Answer (A/B/C/D)', 'answer', 'correct_option', 'correct_answer', 'ans').toUpperCase();
      const diffVal = getVal('Difficulty (easy/medium/hard)', 'difficulty', 'diff').toLowerCase();
      const pointsVal = getVal('Points', 'marks');
      const negVal = getVal('Negative Marks', 'negative_marks');
      const expText = getVal('Explanation', 'solution', 'exp');

      const qTextTr = getVal('Question (Translated)', 'question_tr', 'question_hindi', 'question_lang2');
      const optATr = getVal('Option A (Translated)', 'option_a_tr', 'option_a_hindi', 'opta_hindi');
      const optBTr = getVal('Option B (Translated)', 'option_b_tr', 'option_b_hindi', 'optb_hindi');
      const optCTr = getVal('Option C (Translated)', 'option_c_tr', 'option_c_hindi', 'optc_hindi');
      const optDTr = getVal('Option D (Translated)', 'option_d_tr', 'option_d_hindi', 'optd_hindi');

      const subjectVal = getVal('Subject', 'trade');
      const topicVal = getVal('Topic', 'unit');
      const chapterVal = getVal('Chapter', 'module');

      const expTextTr = getVal('Explanation (Translated)', 'explanation_tr', 'explanation_hindi', 'solution_hindi');
      const expImgRaw = getVal('Explanation Image URL', 'Explanation Image', 'explanation_image_url', 'explanation_image', 'explanation_img', 'solution_img');

      // Convert Google Drive open links smartly
      const imageUrl = convertGoogleDriveUrl(qImgRaw);
      const expImage = convertGoogleDriveUrl(expImgRaw);

      const optAImg = convertGoogleDriveUrl(optAImgRaw);
      const optBImg = convertGoogleDriveUrl(optBImgRaw);
      const optCImg = convertGoogleDriveUrl(optCImgRaw);
      const optDImg = convertGoogleDriveUrl(optDImgRaw);

      const optionsImage = (optAImg || optBImg || optCImg || optDImg) ? {
        A: optAImg,
        B: optBImg,
        C: optCImg,
        D: optDImg,
      } : undefined;

      const optionsTr = (optATr || optBTr || optCTr || optDTr) ? {
        A: optATr || undefined,
        B: optBTr || undefined,
        C: optCTr || undefined,
        D: optDTr || undefined,
      } : undefined;

      let correctOpt: 'A' | 'B' | 'C' | 'D' = 'A';
      if (['A', 'B', 'C', 'D'].includes(rawAns)) {
        correctOpt = rawAns as any;
      } else if (rawAns === '1' || rawAns.startsWith('A')) correctOpt = 'A';
      else if (rawAns === '2' || rawAns.startsWith('B')) correctOpt = 'B';
      else if (rawAns === '3' || rawAns.startsWith('C')) correctOpt = 'C';
      else if (rawAns === '4' || rawAns.startsWith('D')) correctOpt = 'D';

      if (qText && optA && optB) {
        questions.push({
          question_id: `q_ex_${Date.now()}_${idx}`,
          folder_id: folderIdToUse === 'root' ? undefined : folderIdToUse,
          exam_type: 'NCVT ITI',
          subject: subjectVal || 'Trade Theory',
          chapter: chapterVal || 'General Theory',
          topic: topicVal || 'Core Concept',
          question_text: qText,
          question_tr: qTextTr || undefined,
          image_url: imageUrl,
          options: {
            A: optA,
            B: optB,
            C: optC || 'N/A',
            D: optD || 'N/A'
          },
          options_tr: optionsTr,
          options_image: optionsImage,
          correct_option: correctOpt,
          difficulty: (diffVal as any) || 'medium',
          points: parseInt(pointsVal) || 1,
          negative_marks: parseFloat(negVal) || 0,
          explanation: expText || undefined,
          explanation_tr: expTextTr || undefined,
          explanation_image: expImage || undefined,
          createdAt: new Date().toISOString()
        });
      }
    });

    return questions;
  };

  // Handle File Upload Change (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const isCsv = file.name.endsWith('.csv');

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const qs = processRowsToQuestions(results.data, selectedFolderId);
          if (qs.length === 0) {
            setError('No valid questions found. Ensure your sheet has columns: Question, Option A, Option B, Option C, Option D, Correct Option.');
          } else {
            setParsedQuestions(qs);
          }
          setLoading(false);
        },
        error: (err) => {
          setError(`CSV Parsing error: ${err.message}`);
          setLoading(false);
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet);

          const qs = processRowsToQuestions(rawRows, selectedFolderId);
          if (qs.length === 0) {
            setError('No valid questions found in Excel sheet. Please verify column headers.');
          } else {
            setParsedQuestions(qs);
          }
        } catch (err: any) {
          setError(`Excel Parsing error: ${err.message || 'Invalid file format'}`);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  // Save all parsed questions to Firestore / Question Bank
  const handleImportToFolder = async () => {
    if (parsedQuestions.length === 0) return;

    setLoading(true);
    setError('');
    let savedCount = 0;

    try {
      for (const q of parsedQuestions) {
        const finalFolderId = selectedFolderId === 'root' ? undefined : selectedFolderId;
        const finalQuestion = { ...q, folder_id: finalFolderId };
        await safeSetDoc('questions', q.question_id, 'question_id', finalQuestion);
        savedCount++;
      }

      setSuccessMessage(`Successfully imported ${savedCount} questions into Question Bank!`);
      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(`Failed to save questions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate Sample Excel/CSV file for download matching exact Columns A to W
  const handleDownloadSampleCsv = () => {
    const csvContent = 
`Question Text,Question Image URL,Option A Text,Option A Image URL,Option B Text,Option B Image URL,Option C Text,Option C Image URL,Option D Text,Option D Image URL,Answer (A/B/C/D),Difficulty (easy/medium/hard),Points,Negative Marks,Explanation,Question (Translated),Option A (Translated),Option B (Translated),Option C (Translated),Option D (Translated),Subject,Topic,Chapter
"What is the SI unit of resistance?","https://drive.google.com/file/d/1ExampleDriveFileID1/view?usp=sharing","Volt","","Ampere","","Ohm","","Watt","","C","easy","1","0","Resistance is measured in Ohms (Ω).","प्रतिरोध की SI इकाई क्या है?","वोल्ट","एम्पीयर","ओम","वाट","Trade Theory","Resistors","Basic Electricity"
"Which tool is used for cutting thick electrical wires?","","Combination Pliers","","Wire Stripper","","Crimping Tool","","Screw Driver","","A","easy","1","0","Combination pliers have sharp cutting edges for wires.","मोटे बिजली के तारों को काटने के लिए किस उपकरण का उपयोग किया जाता है?","कॉम्बिनेशन प्लायर","वायर स्ट्रिपर","क्रिम्पिंग टूल","स्क्रू ड्राइवर","Trade Tools","Cutting Tools","Safety & Tools"
"What is Ohm's Law formula?","","V=I*R","","V=I/R","","V=I+R","","V=I^2","","A","medium","1","0","V equals Current times Resistance.","ओम का नियम सूत्र क्या है?","V=I*R","V=I/R","V=I+R","V=I^2","Trade Theory","Ohm Law","Electrical Laws"`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'QuestionBank_Template_A_to_W.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[700] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-5 flex items-center justify-between border-b border-emerald-700/50">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-2xl border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import Questions via Excel / CSV</h2>
              <p className="text-xs text-emerald-200">
                Bulk upload question banks into structured folders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Target Folder Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FolderCheck className="w-4 h-4 text-emerald-400" />
              <span>Target Question Bank Folder</span>
            </label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="root">📁 Root Directory (Unassigned)</option>
              {folders.map((f) => (
                <option key={f.folder_id} value={f.folder_id}>
                  📁 {f.path || f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sample Download Button */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>Need the standard Excel/CSV template layout?</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold text-[11px] rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* File Drag & Drop Zone */}
          <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/80 bg-slate-950/50 rounded-2xl p-6 text-center transition-all relative group cursor-pointer">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-white">
                {fileName ? `File Selected: ${fileName}` : 'Click or Drag & Drop Excel (.xlsx, .xls) or CSV Sheet'}
              </p>
              <p className="text-[11px] text-slate-400">
                Supports automatic column matching for Questions, Options A-D, Answer, Subject &amp; Explanations.
              </p>
            </div>
          </div>

          {/* Error / Success Notifications */}
          {error && (
            <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedQuestions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <span>Parsed Questions Preview ({parsedQuestions.length} Questions)</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                  Ready to Import
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950 divide-y divide-slate-800 text-xs">
                {parsedQuestions.map((q, i) => (
                  <div key={i} className="p-3 space-y-1.5">
                    <div className="font-bold text-white flex items-center justify-between gap-2">
                      <span className="truncate">{i + 1}. {q.question_text}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {q.question_tr && (
                          <span className="text-[9px] font-bold text-blue-300 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5" />
                            <span>Bilingual</span>
                          </span>
                        )}
                        {(q.image_url || q.options_image) && (
                          <span className="text-[9px] font-bold text-purple-300 bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800 flex items-center gap-1">
                            <ImageIcon className="w-2.5 h-2.5" />
                            <span>Drive Img</span>
                          </span>
                        )}
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full">
                          Ans: {q.correct_option}
                        </span>
                      </div>
                    </div>

                    {q.question_tr && (
                      <p className="text-[11px] text-blue-400 italic">Hindi/Lang 2: {q.question_tr}</p>
                    )}

                    <div className="grid grid-cols-2 gap-x-4 text-[11px] text-slate-400">
                      <div>A: {q.options.A} {q.options_tr?.A ? `(${q.options_tr.A})` : ''}</div>
                      <div>B: {q.options.B} {q.options_tr?.B ? `(${q.options_tr.B})` : ''}</div>
                      <div>C: {q.options.C} {q.options_tr?.C ? `(${q.options_tr.C})` : ''}</div>
                      <div>D: {q.options.D} {q.options_tr?.D ? `(${q.options_tr.D})` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedQuestions.length === 0 || loading}
            onClick={handleImportToFolder}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>Saving Questions...</span>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Confirm &amp; Import ({parsedQuestions.length})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
