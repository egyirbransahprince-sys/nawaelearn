
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Teacher, NawaClass, Student, Quiz, Note, Lesson, Enquiry, Submission, Gender, QuizCategory, Question, QuestionType, NoteType, LessonType, Recording, EnquiryMessage, BreakoutGroup, BreakoutSession, QuestionBankFolder, ReportData, GradeRange } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
    BookOpenIcon, CheckSquareIcon, UsersIcon, TrendingUpIcon, LogOutIcon, ChevronLeftIcon,
    BarChart2Icon, ClipboardCheckIcon, HelpCircleIcon, PlusCircleIcon, EditIcon, Trash2Icon, ChevronDownIcon,
    Wand2Icon, XCircleIcon, ClockIcon, LockIcon, UnlockIcon, MicIcon, VideoIcon, RecordIcon, GitMergeIcon, SendIcon,
    FileWordIcon, ImageIcon, PaperclipIcon, ArrowDownToLineIcon, FolderIcon, FolderPlusIcon, PrinterIcon, BrushIcon, EyeIcon, XIcon, CheckIcon, UserCircleIcon, ScreenShareIcon, ArchiveIcon, VideoOffIcon, MicOffIcon, 
    ScreenShareOffIcon, UploadCloudIcon
} from './icons';
import NotificationBell from './NotificationBell';
import InstallPWAButton from './InstallPWAButton';

// Helper to compress images to save local storage space
const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 600): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% quality JPEG
        };
        img.onerror = () => resolve(base64Str); // Fallback to original
    });
};

// --- FORWARD DECLARations OF TAB COMPONENTS ---
let DashboardTab: React.FC<any> = () => null;
let StudentsTab: React.FC<any> = () => null;
let LessonsNotesTab: React.FC<any> = () => null;
let QuizzesTab: React.FC<any> = () => null;
let QuestionBankTab: React.FC<any> = () => null;
let SubmissionsTab: React.FC<any> = () => null;
let EnquiriesTab: React.FC<any> = () => null;
let RecordingsTab: React.FC<any> = () => null;
let ProgressTrackerTab: React.FC<{
    classStudents: Student[];
    quizzes: Quiz[];
    submissions: Submission[];
    viewingStudentId: string | null;
    setViewingStudentId: React.Dispatch<React.SetStateAction<string | null>>;
}> = () => null;

interface TeacherDashboardProps {
  teacher: Teacher;
  selectedClass: NawaClass;
  onBackToClasses: () => void;
  onLogout: () => void;
}

const VideoRecorder: React.FC<{
    onSave: (url: string) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    
    const [isRecording, setIsRecording] = useState(false);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

    useEffect(() => {
        const startStream = async () => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
              alert("Your browser does not support camera access.");
              onCancel();
              return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err: any) {
                console.error("Error accessing camera for recording.", err);
                if (err.name === 'NotAllowedError') {
                  alert("Camera permission denied. Please allow camera access in your browser settings.");
                } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                  alert("No camera or microphone found on your device.");
                } else {
                  alert("Could not access camera. Error: " + err.message);
                }
                onCancel();
            }
        };
        startStream();

        return () => {
            streamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, []);
    
    const handleStartRecording = () => {
        if (!streamRef.current) return;
        recordedChunksRef.current = [];
        setRecordedUrl(null);
        setRecordedBlob(null);

        const mimeTypes = [
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ];
        const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

        if (!supportedMimeType) {
            alert("Video recording is not supported on your browser.");
            return;
        }

        try {
            mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: supportedMimeType });
            mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) recordedChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: supportedMimeType });
                const url = URL.createObjectURL(blob);
                setRecordedUrl(url);
                setRecordedBlob(blob);
                if(videoRef.current) {
                    videoRef.current.srcObject = null;
                }
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Exception while creating MediaRecorder:", e);
            alert("Could not start recording. Please ensure microphone and camera permissions are granted.");
        }
    };

    const handleStopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const handleSave = () => {
        if (recordedBlob) {
            const reader = new FileReader();
            reader.readAsDataURL(recordedBlob);
            reader.onloadend = () => {
                onSave(reader.result as string);
            };
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl">
                <h2 className="text-xl font-bold mb-4 text-white">Record Video</h2>
                <div className="bg-black aspect-video rounded-lg mb-4">
                    <video ref={videoRef} autoPlay playsInline muted={!recordedUrl} controls={!!recordedUrl} src={recordedUrl || undefined} className="w-full h-full"></video>
                </div>
                <div className="flex justify-center items-center space-x-4">
                    {!isRecording && !recordedUrl && (
                        <button onClick={handleStartRecording} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Start Recording</button>
                    )}
                    {isRecording && (
                         <button onClick={handleStopRecording} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 animate-pulse">Stop Recording</button>
                    )}
                </div>
                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                    <button onClick={handleSave} disabled={!recordedBlob} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-800 disabled:opacity-50">Save Video</button>
                </div>
            </div>
        </div>
    );
};

const AudioRecorder: React.FC<{
    onSave: (url: string) => void;
    onCancel: () => void;
}> = ({ onSave, onCancel }) => {
    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const [isRecording, setIsRecording] = useState(false);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);

    useEffect(() => {
        let timer: number;
        if(isRecording) {
            timer = window.setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
        }
        return () => window.clearInterval(timer);
    }, [isRecording]);

    const handleStartRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Your browser does not support microphone access.");
            onCancel();
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            audioChunksRef.current = [];
            setRecordedUrl(null);
            setRecordedBlob(null);

            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/ogg;codecs=opus',
                'audio/ogg',
                'audio/mp4',
                'audio/aac'
            ];
            const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

            if (!supportedMimeType) {
                alert("Audio recording is not supported on your browser.");
                stream.getTracks().forEach(track => track.stop());
                onCancel();
                return;
            }

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: supportedMimeType });
            mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: supportedMimeType });
                const url = URL.createObjectURL(blob);
                setRecordedUrl(url);
                setRecordedBlob(blob);
                streamRef.current?.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
        } catch (err: any) {
            console.error("Error accessing mic for recording.", err);
            if (err.name === 'NotAllowedError') {
              alert("Microphone permission denied.");
            } else {
              alert("Could not access microphone.");
            }
            onCancel();
        }
    };

    const handleStopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };
    
    const handleSave = () => {
        if(recordedBlob) {
            const reader = new FileReader();
            reader.readAsDataURL(recordedBlob);
            reader.onloadend = () => {
                onSave(reader.result as string);
            };
        }
    };
    
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 text-white">Record Audio</h2>
                <div className="text-center py-8">
                    {!isRecording && !recordedUrl && (
                        <button onClick={handleStartRecording} className="p-4 bg-red-600 rounded-full text-white hover:bg-red-700"><MicIcon className="w-8 h-8"/></button>
                    )}
                    {isRecording && (
                        <div>
                             <p className="text-4xl font-mono text-white mb-4">{formatTime(recordingTime)}</p>
                             <button onClick={handleStopRecording} className="p-4 bg-red-600 rounded-full text-white hover:bg-red-700 animate-pulse"><MicOffIcon className="w-8 h-8"/></button>
                        </div>
                    )}
                    {recordedUrl && (
                        <audio src={recordedUrl} controls className="w-full" />
                    )}
                </div>
                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                    <button onClick={handleSave} disabled={!recordedBlob} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-800 disabled:opacity-50">Save Audio</button>
                </div>
            </div>
        </div>
    );
};

const QuestionModal: React.FC<{
    question: Question | null;
    onSave: (question: Question) => void;
    onClose: () => void;
}> = ({ question, onSave, onClose }) => {
    const [formData, setFormData] = useState<Question>(
        question || {
            id: `q-${Date.now()}`,
            type: QuestionType.MultipleChoice,
            text: '',
            options: ['', '', '', ''],
            correctAnswer: '',
            explanation: '',
            totalMarks: 10,
            source: 'manual',
        }
    );

    useEffect(() => {
        if (question) {
            setFormData(question);
        }
    }, [question]);

    const handleChange = (field: keyof Question, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...(formData.options || ['', '', '', ''])];
        newOptions[index] = value;
        handleChange('options', newOptions);
    };
    
    const handleTypeChange = (newType: QuestionType) => {
        const updatedData: Question = { ...formData, type: newType };
        if (newType === QuestionType.MultipleChoice) {
            updatedData.options = formData.options && formData.options.length === 4 ? formData.options : ['', '', '', ''];
            updatedData.correctAnswer = '';
        } else {
            delete (updatedData as Partial<Question>).options;
        }
        if (newType === QuestionType.TrueFalse) {
            updatedData.correctAnswer = 'True';
        } else if (newType === QuestionType.Essay) {
            updatedData.correctAnswer = '';
        }
        setFormData(updatedData);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70] p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-white">{question ? 'Edit Question' : 'Create New Question'}</h2>
                <form onSubmit={handleSubmit} id="question-form" className="flex-grow overflow-y-auto pr-2 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Question Type</label>
                        <select value={formData.type} onChange={(e) => handleTypeChange(e.target.value as QuestionType)} className="mt-1 w-full bg-gray-700 p-2 rounded">
                            {Object.values(QuestionType).map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Question Text</label>
                        <textarea value={formData.text} onChange={e => handleChange('text', e.target.value)} rows={3} className="mt-1 w-full bg-gray-700 p-2 rounded" required />
                    </div>

                    {formData.type === QuestionType.MultipleChoice && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Options & Correct Answer</label>
                            {formData.options?.map((opt, index) => (
                                <div key={index} className="flex items-center gap-2 mt-1">
                                    <input type="radio" name={`correct-${formData.id}`} checked={formData.correctAnswer === opt} onChange={() => handleChange('correctAnswer', opt)} />
                                    <input type="text" value={opt} onChange={e => handleOptionChange(index, e.target.value)} className="flex-grow bg-gray-600 p-1 rounded" placeholder={`Option ${index + 1}`} required />
                                </div>
                            ))}
                        </div>
                    )}
                    {formData.type === QuestionType.TrueFalse && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Correct Answer</label>
                            <div className="mt-1">
                                <label className="mr-4"><input type="radio" name={`correct-${formData.id}`} checked={formData.correctAnswer === 'True'} onChange={() => handleChange('correctAnswer', 'True')} /> True</label>
                                <label><input type="radio" name={`correct-${formData.id}`} checked={formData.correctAnswer === 'False'} onChange={() => handleChange('correctAnswer', 'False')} /> False</label>
                            </div>
                        </div>
                    )}
                     {formData.type === QuestionType.Essay && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Model Answer / Grading Criteria</label>
                            <textarea value={formData.correctAnswer || ''} onChange={e => handleChange('correctAnswer', e.target.value)} rows={4} className="mt-1 w-full bg-gray-700 p-2 rounded" />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-400">Explanation</label>
                        <textarea value={formData.explanation || ''} onChange={e => handleChange('explanation', e.target.value)} rows={2} className="mt-1 w-full bg-gray-700 p-2 rounded" />
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-400">Total Marks</label>
                        <input type="number" value={formData.totalMarks} onChange={e => handleChange('totalMarks', parseInt(e.target.value))} min="1" className="mt-1 w-24 bg-gray-700 p-2 rounded" />
                    </div>

                </form>
                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                    <button type="submit" form="question-form" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-800">Save Question</button>
                </div>
            </div>
        </div>
    );
};

const LessonNoteCreator: React.FC<{
    item?: Lesson | Note;
    type: 'lesson' | 'note';
    classId: string;
    onSave: (item: Lesson | Note) => void;
    onCancel: () => void;
}> = ({ item, type, classId, onSave, onCancel }) => {
    const [formData, setFormData] = useState(() => {
        if (item) return item;
        const common = {
            id: `${type}-${Date.now()}`,
            classId,
            title: '',
            code: Math.random().toString(36).substring(2, 8).toUpperCase(),
            requireAccessCode: false,
        };
        if (type === 'lesson') {
            return {
                ...common,
                type: LessonType.Live,
                initialStudentMicOn: false,
                initialStudentVideoOn: true,
                allowStudentControlMic: true,
                allowStudentControlVideo: true,
                allowStudentRecording: false,
                allowStudentScreenSharing: false,
            } as Lesson;
        } else {
            return {
                ...common,
                type: NoteType.Text,
                content: '',
            } as Note;
        }
    });

    const [fileUploading, setFileUploading] = useState(false);
    const [fileError, setFileError] = useState('');
    const [contentSource, setContentSource] = useState<'url' | 'uploadVideo' | 'uploadAudio' | 'recordVideo' | 'recordAudio'>(
        item && (item as Lesson).url?.startsWith('data:') ? 'uploadVideo' : 'url'
    );
    const [showVideoRecorder, setShowVideoRecorder] = useState(false);
    const [showAudioRecorder, setShowAudioRecorder] = useState(false);


    const handleChange = (field: keyof (Lesson & Note), value: any) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const handleGenerateCode = () => {
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        handleChange('code', newCode);
    };

    const handleLessonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setFileUploading(true);
        setFileError('');

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            handleChange('url', dataUrl);
        } catch (err) {
            setFileError("Failed to read file.");
            console.error(err);
        } finally {
            setFileUploading(false);
        }
    };

    const handleNoteFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        setFileUploading(true);
        setFileError('');

        const noteType = (formData as Note).type;
        const isMultiImage = noteType === NoteType.Images && files.length > 1;

        try {
            const dataUrls = await Promise.all(Array.from(files).map((file: File) => new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            })));
            
            handleChange('content', isMultiImage ? dataUrls : dataUrls[0]);
        } catch (err) {
            setFileError("Failed to read file.");
            console.error(err);
        } finally {
            setFileUploading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const isLesson = type === 'lesson';
    const lessonData = formData as Lesson;
    const noteData = formData as Note;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-white">{item ? 'Edit' : 'Create'} {isLesson ? 'Lesson' : 'Note'}</h2>
                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-2 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Title</label>
                        <input type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} className="mt-1 w-full bg-gray-700 p-2 rounded" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400">Type</label>
                        <select value={formData.type} onChange={e => handleChange('type', e.target.value)} className="mt-1 w-full bg-gray-700 p-2 rounded">
                            {Object.values(isLesson ? LessonType : NoteType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {!isLesson && (
                        <div>
                             <label className="block text-sm font-medium text-gray-400">Content</label>
                             {noteData.type === NoteType.Text ? (
                                <textarea value={noteData.content as string} onChange={e => handleChange('content', e.target.value)} rows={8} className="mt-1 w-full bg-gray-700 p-2 rounded" />
                             ) : (
                                <div className="mt-1 flex items-center space-x-2 p-2 bg-gray-700 rounded-md">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-primary text-white font-semibold rounded-md py-2 px-3 hover:bg-blue-800">
                                      <span>Upload a file</span>
                                      <input id="file-upload" name="file-upload" type="file" className="sr-only" 
                                        onChange={handleNoteFileChange}
                                        multiple={noteData.type === NoteType.Images}
                                        accept={noteData.type === NoteType.Images ? 'image/*' : noteData.type === NoteType.PDF ? '.pdf' : '.doc,.docx'}
                                      />
                                    </label>
                                    <div className="text-sm">
                                      {fileUploading && <p className="text-blue-400">Uploading...</p>}
                                      {fileError && <p className="text-red-500">{fileError}</p>}
                                      {typeof noteData.content === 'string' && noteData.content.startsWith('data:') && <p className="text-green-400">File uploaded</p>}
                                      {Array.isArray(noteData.content) && noteData.content.length > 0 && <p className="text-green-400">{noteData.content.length} files uploaded</p>}
                                    </div>
                                </div>
                             )}
                        </div>
                    )}
                    
                    {isLesson && lessonData.type === LessonType.Prerecorded && (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Lesson Content</label>

                            {lessonData.url && (
                                <div className="mb-4 p-3 bg-gray-900 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm font-semibold text-green-400">Current Content:</p>
                                        <button type="button" onClick={() => handleChange('url', '')} className="text-xs text-red-400 hover:underline flex items-center">
                                            <Trash2Icon className="w-3 h-3 mr-1" /> Remove
                                        </button>
                                    </div>

                                    {lessonData.url.startsWith('data:video') && (
                                        <video src={lessonData.url} controls className="w-full h-auto max-h-[40vh] rounded" />
                                    )}
                                    {lessonData.url.startsWith('data:audio') && (
                                        <audio src={lessonData.url} controls className="w-full" />
                                    )}
                                    {!lessonData.url.startsWith('data:') && (
                                        <div className="aspect-video bg-black rounded">
                                            <iframe 
                                                src={lessonData.url.replace("watch?v=", "embed/")}
                                                title={lessonData.title} 
                                                frameBorder="0" 
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                allowFullScreen 
                                                className="w-full h-full">
                                            </iframe>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 border-b border-gray-700 pb-2 mb-4">
                                <button type="button" onClick={() => setContentSource('url')} className={`px-3 py-1 text-sm rounded ${contentSource === 'url' ? 'bg-accent text-gray-900' : 'bg-gray-600 hover:bg-gray-500'}`}>Enter URL</button>
                                <button type="button" onClick={() => setContentSource('uploadVideo')} className={`px-3 py-1 text-sm rounded ${contentSource === 'uploadVideo' ? 'bg-accent text-gray-900' : 'bg-gray-600 hover:bg-gray-500'}`}>Upload Video</button>
                                <button type="button" onClick={() => setContentSource('uploadAudio')} className={`px-3 py-1 text-sm rounded ${contentSource === 'uploadAudio' ? 'bg-accent text-gray-900' : 'bg-gray-600 hover:bg-gray-500'}`}>Upload Audio</button>
                                <button type="button" onClick={() => setContentSource('recordVideo')} className={`px-3 py-1 text-sm rounded ${contentSource === 'recordVideo' ? 'bg-accent text-gray-900' : 'bg-gray-600 hover:bg-gray-500'}`}>Record Video</button>
                                <button type="button" onClick={() => setContentSource('recordAudio')} className={`px-3 py-1 text-sm rounded ${contentSource === 'recordAudio' ? 'bg-accent text-gray-900' : 'bg-gray-600 hover:bg-gray-500'}`}>Record Audio</button>
                            </div>
                            
                            {contentSource === 'url' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400">Enter Video/Audio URL</label>
                                    <input 
                                        type="text" 
                                        value={lessonData.url?.startsWith('data:') ? '' : lessonData.url || ''}
                                        onChange={e => handleChange('url', e.target.value)} 
                                        className="mt-1 w-full bg-gray-700 p-2 rounded" 
                                        placeholder="e.g., https://www.youtube.com/watch?v=..."
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Provide a link to a video or audio resource (e.g., YouTube, Vimeo).</p>
                                </div>
                            )}
                            {contentSource === 'uploadVideo' && (
                                <div className="mt-1 p-2 bg-gray-700 rounded-md">
                                    <label htmlFor="video-upload" className="relative cursor-pointer bg-primary text-white font-semibold rounded-md py-2 px-3 hover:bg-blue-800 flex items-center space-x-2">
                                        <UploadCloudIcon className="w-5 h-5" />
                                        <span>Choose a video file</span>
                                        <input id="video-upload" name="video-upload" type="file" className="sr-only" onChange={handleLessonFileChange} accept="video/*" />
                                    </label>
                                    {fileUploading && <p className="text-blue-400 text-sm mt-2">Uploading...</p>}
                                    {fileError && <p className="text-red-500 text-sm mt-2">{fileError}</p>}
                                </div>
                            )}
                            {contentSource === 'uploadAudio' && (
                                <div className="mt-1 p-2 bg-gray-700 rounded-md">
                                    <label htmlFor="audio-upload" className="relative cursor-pointer bg-primary text-white font-semibold rounded-md py-2 px-3 hover:bg-blue-800 flex items-center space-x-2">
                                        <UploadCloudIcon className="w-5 h-5" />
                                        <span>Choose an audio file</span>
                                        <input id="audio-upload" name="audio-upload" type="file" className="sr-only" onChange={handleLessonFileChange} accept="audio/*" />
                                    </label>
                                    {fileUploading && <p className="text-blue-400 text-sm mt-2">Uploading...</p>}
                                    {fileError && <p className="text-red-500 text-sm mt-2">{fileError}</p>}
                                </div>
                            )}
                            {contentSource === 'recordVideo' && (
                                <div className="mt-1 p-2 bg-gray-700 rounded-md">
                                    <button type="button" onClick={() => setShowVideoRecorder(true)} className="bg-primary text-white font-semibold rounded-md py-2 px-3 hover:bg-blue-800 flex items-center space-x-2">
                                        <VideoIcon className="w-5 h-5"/>
                                        <span>Record a new video</span>
                                    </button>
                                </div>
                            )}
                            {contentSource === 'recordAudio' && (
                                <div className="mt-1 p-2 bg-gray-700 rounded-md">
                                    <button type="button" onClick={() => setShowAudioRecorder(true)} className="bg-primary text-white font-semibold rounded-md py-2 px-3 hover:bg-blue-800 flex items-center space-x-2">
                                        <MicIcon className="w-5 h-5"/>
                                        <span>Record new audio</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {isLesson && lessonData.type === LessonType.Live && (
                         <div>
                            <label className="block text-sm font-medium text-gray-400">Scheduled Time</label>
                            <input type="datetime-local" value={lessonData.scheduledTime ? new Date(lessonData.scheduledTime).toISOString().slice(0, 16) : ''} onChange={e => handleChange('scheduledTime', new Date(e.target.value).getTime())} className="mt-1 w-full bg-gray-700 p-2 rounded" />
                        </div>
                    )}
                    {isLesson && (
                        <fieldset className="border border-gray-600 p-3 rounded-md">
                            <legend className="px-1 text-sm font-medium text-gray-400">Student Permissions</legend>
                            <div className="space-y-2 mt-2">
                                <label className="flex items-center text-sm"><input type="checkbox" checked={lessonData.initialStudentMicOn} onChange={e => handleChange('initialStudentMicOn', e.target.checked)} className="mr-2" /> Start with student microphone ON</label>
                                <label className="flex items-center text-sm"><input type="checkbox" checked={lessonData.initialStudentVideoOn} onChange={e => handleChange('initialStudentVideoOn', e.target.checked)} className="mr-2" /> Start with student video ON</label>
                                <label className="flex items-center text-sm"><input type="checkbox" checked={lessonData.allowStudentControlMic} onChange={e => handleChange('allowStudentControlMic', e.target.checked)} className="mr-2" /> Allow students to control their mic</label>
                                <label className="flex items-center text-sm"><input type="checkbox" checked={lessonData.allowStudentControlVideo} onChange={e => handleChange('allowStudentControlVideo', e.target.checked)} className="mr-2" /> Allow students to control their video</label>
                                <label className="flex items-center text-sm"><input type="checkbox" checked={lessonData.allowStudentRecording} onChange={e => handleChange('allowStudentRecording', e.target.checked)} className="mr-2" /> Allow students to record</label>
                                <label className="flex items-center text-sm"><input type="checkbox" checked={lessonData.allowStudentScreenSharing} onChange={e => handleChange('allowStudentScreenSharing', e.target.checked)} className="mr-2" /> Allow students to share their screen</label>
                            </div>
                        </fieldset>
                    )}
                    
                    <div>
                        <label className="flex items-center"><input type="checkbox" checked={formData.requireAccessCode} onChange={e => handleChange('requireAccessCode', e.target.checked)} className="mr-2" /> Require Access Code</label>
                        {formData.requireAccessCode && (
                            <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-400">Access Code</label>
                                <div className="flex items-center space-x-2 mt-1">
                                    <input 
                                        type="text" 
                                        value={formData.code} 
                                        onChange={e => handleChange('code', e.target.value.toUpperCase())}
                                        className="flex-grow bg-gray-600 p-2 rounded font-mono" 
                                        placeholder="Enter or generate a code"
                                        maxLength={6}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={handleGenerateCode}
                                        className="px-3 py-2 bg-secondary text-white rounded-md text-sm hover:bg-emerald-600 flex items-center space-x-2"
                                        title="Generate a random code"
                                    >
                                        <Wand2Icon className="w-4 h-4" />
                                        <span>Generate</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                    <button type="submit" onClick={handleSubmit} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-800">Save</button>
                </div>
                {showVideoRecorder && <VideoRecorder onSave={(url) => { handleChange('url', url); setShowVideoRecorder(false); }} onCancel={() => setShowVideoRecorder(false)} />}
                {showAudioRecorder && <AudioRecorder onSave={(url) => { handleChange('url', url); setShowAudioRecorder(false); }} onCancel={() => setShowAudioRecorder(false)} />}
            </div>
        </div>
    );
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ teacher, selectedClass, onBackToClasses, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  
  const [students, setStudents] = useLocalStorage<Student[]>('students', []);
  const [quizzes, setQuizzes] = useLocalStorage<Quiz[]>(`quizzes-${selectedClass.id}`, []);
  const [notes, setNotes] = useLocalStorage<Note[]>(`notes-${selectedClass.id}`, []);
  const [lessons, setLessons] = useLocalStorage<Lesson[]>(`lessons-${selectedClass.id}`, []);
  const [enquiries, setEnquiries] = useLocalStorage<Enquiry[]>('enquiries', []);
  const [submissions, setSubmissions] = useLocalStorage<Submission[]>('submissions', []);
  const [questionBank, setQuestionBank] = useLocalStorage<QuestionBankFolder[]>(`questionbank-${teacher.id}`, []);


  const classStudents = useMemo(() => students.filter(s => s.classId === selectedClass.id), [students, selectedClass.id]);
  const classSubmissions = useMemo(() => submissions.filter(sub => classStudents.some(s => s.id === sub.studentId)), [submissions, classStudents]);
  const classEnquiries = useMemo(() => enquiries.filter(e => e.classId === selectedClass.id), [enquiries, selectedClass.id]);
  
  const renderContent = () => {
    const commonProps = {
      teacher,
      selectedClass,
      classStudents,
    };
    switch(activeTab) {
      case 'dashboard': return <DashboardTab {...commonProps} submissions={classSubmissions} enquiries={classEnquiries} lessons={lessons} />;
      case 'students': return <StudentsTab {...commonProps} setStudents={setStudents} setActiveTab={setActiveTab} setViewingStudentId={setViewingStudentId} />;
      case 'lessons': return <LessonsNotesTab {...commonProps} lessons={lessons} setLessons={setLessons} notes={notes} setNotes={setNotes} />;
      case 'quizzes': return <QuizzesTab {...commonProps} quizzes={quizzes} setQuizzes={setQuizzes} questionBank={questionBank} />;
      case 'question-bank': return <QuestionBankTab {...commonProps} questionBank={questionBank} setQuestionBank={setQuestionBank} />;
      case 'submissions': return <SubmissionsTab {...commonProps} quizzes={quizzes} submissions={submissions} setSubmissions={setSubmissions} />;
      case 'enquiries': return <EnquiriesTab {...commonProps} enquiries={classEnquiries} setEnquiries={setEnquiries} />;
      case 'recordings': return <RecordingsTab lessons={lessons} teacher={teacher} setLessons={setLessons} classStudents={classStudents} />;
      case 'reports': return <ProgressTrackerTab {...commonProps} quizzes={quizzes} submissions={classSubmissions} viewingStudentId={viewingStudentId} setViewingStudentId={setViewingStudentId} />;
      default: return null;
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2Icon },
    { id: 'students', label: 'Students', icon: UsersIcon },
    { id: 'lessons', label: 'Lessons & Notes', icon: BookOpenIcon },
    { id: 'quizzes', label: 'Quizzes', icon: CheckSquareIcon },
    { id: 'question-bank', label: 'Question Bank', icon: FolderIcon },
    { id: 'submissions', label: 'Submissions', icon: ClipboardCheckIcon },
    { id: 'enquiries', label: 'Enquiries', icon: HelpCircleIcon },
    { id: 'recordings', label: 'Recordings', icon: ArchiveIcon },
    { id: 'reports', label: 'Progress Tracker', icon: TrendingUpIcon },
  ];
  
  const teacherTitle = teacher.gender === Gender.Male ? 'Sir' : 'Madam';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300">
      <header className="bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
               <button onClick={onBackToClasses} className="text-gray-400 hover:text-blue-400">
                <ChevronLeftIcon className="w-6 h-6" />
               </button>
               <div>
                 <h1 className="text-2xl font-bold text-accent">{selectedClass.name}</h1>
                 <p className="text-sm text-gray-400">Welcome, {teacherTitle} {teacher.fullName}</p>
               </div>
            </div>
            <div className="flex items-center space-x-4">
              <InstallPWAButton isTeacher={true} />
              <NotificationBell user={teacher} />
              <button onClick={onLogout} className="flex items-center text-sm text-gray-400 hover:text-accent">
                <LogOutIcon className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <aside className="md:col-span-1">
             <div className="bg-gray-800 rounded-lg shadow p-4">
               <nav className="space-y-1">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === tab.id ? 'bg-accent text-gray-900' : 'text-gray-300 hover:bg-gray-700'}`}>
                        <tab.icon className={`mr-3 flex-shrink-0 h-6 w-6 ${activeTab === tab.id ? 'text-gray-900' : 'text-gray-400'}`} />
                        <span className="truncate">{tab.label}</span>
                    </button>
                ))}
               </nav>
            </div>
          </aside>
          <div className="md:col-span-3">
            <div className="bg-gray-800 rounded-lg shadow p-6 min-h-[600px]">
              {renderContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const AIQuestionGeneratorModal: React.FC<{
    onSave: (questions: Question[]) => void;
    onClose: () => void;
}> = ({ onSave, onClose }) => {
    const [aiPrompt, setAiPrompt] = useState('');
    const [numMcq, setNumMcq] = useState(2);
    const [numTf, setNumTf] = useState(2);
    const [numEssay, setNumEssay] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState('');

    const handleGenerateAndSave = async () => {
        if (!aiPrompt.trim()) {
            setAiError("Please enter a topic or prompt.");
            return;
        }
        const totalQuestions = numMcq + numTf + numEssay;
        if (totalQuestions <= 0) {
            setAiError("Please specify a number of questions greater than zero.");
            return;
        }

        setIsGenerating(true);
        setAiError('');

        try {
            if (!process.env.API_KEY) {
                throw new Error("API_KEY environment variable not set.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const fullPrompt = `Generate a total of ${totalQuestions} quiz questions for school students on the topic: "${aiPrompt}".
The questions should be broken down as follows:
- ${numMcq} Multiple Choice questions.
- ${numTf} True/False questions.
- ${numEssay} Essay questions.

For each question, provide a JSON object with the following fields:
- "text": The question itself.
- "type": The question type ("Multiple Choice", "True/False", or "Essay").
- "options": For "Multiple Choice" ONLY, an array of 4 strings. This field must be omitted for other types.
- "correctAnswer": The correct answer. For "Multiple Choice", it must match one of the options. For "True/False", it must be "True" or "False". For "Essay", provide a model answer.
- "explanation": An explanation of the correct answer. For "Essay", explain the grading criteria.
- "totalMarks": An integer between 5 and 20.

The final output must be a single, valid JSON array of these question objects.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: fullPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING },
                                type: { type: Type.STRING, enum: Object.values(QuestionType) },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                correctAnswer: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                totalMarks: { type: Type.NUMBER },
                            },
                            required: ['text', 'type', 'correctAnswer', 'explanation', 'totalMarks']
                        },
                    },
                },
            });

            const generatedQuestions: Omit<Question, 'id' | 'source'>[] = JSON.parse(response.text || '[]');
            onSave(generatedQuestions as Question[]);
            onClose();

        } catch (error) {
            console.error("AI question generation failed:", error);
            setAiError("Failed to generate questions. Please check your prompt or API key setup.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[70] p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4 text-white">Generate Questions with AI</h2>
                <div className="space-y-4">
                    <p className="text-sm text-gray-400">Describe the topic and specify the number of questions for each type.</p>
                    <input
                        type="text"
                        value={aiPrompt}
                        onChange={e => setAiPrompt(e.target.value)}
                        placeholder="e.g., Photosynthesis for 10th graders"
                        className="w-full bg-gray-700 p-2 rounded"
                        disabled={isGenerating}
                    />
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="text-xs text-gray-400">Multiple Choice</label>
                            <input type="number" value={numMcq} onChange={e => setNumMcq(Math.max(0, parseInt(e.target.value)))} min="0" className="w-full bg-gray-700 p-2 rounded" disabled={isGenerating} />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-gray-400">True/False</label>
                            <input type="number" value={numTf} onChange={e => setNumTf(Math.max(0, parseInt(e.target.value)))} min="0" className="w-full bg-gray-700 p-2 rounded" disabled={isGenerating} />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-gray-400">Essay</label>
                            <input type="number" value={numEssay} onChange={e => setNumEssay(Math.max(0, parseInt(e.target.value)))} min="0" className="w-full bg-gray-700 p-2 rounded" disabled={isGenerating} />
                        </div>
                    </div>
                    {aiError && <p className="text-red-500 text-sm">{aiError}</p>}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                    <button onClick={handleGenerateAndSave} disabled={isGenerating} className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-emerald-600 disabled:opacity-50">
                        {isGenerating ? 'Generating...' : 'Generate & Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- TAB COMPONENT IMPLEMENTATIONS ---

(DashboardTab as React.FC<any>) = ({ classStudents, submissions, enquiries }) => {
    const pendingSubmissions = useMemo(() => submissions.filter((s: Submission) => !s.isMarked).length, [submissions]);
    const openEnquiries = useMemo(() => enquiries.filter((e: Enquiry) => !e.isResolved).length, [enquiries]);

    return (
        <div>
            <h2 className="text-xl font-bold text-white mb-6">Class Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-sm font-semibold text-gray-400">Total Students</h3>
                    <p className="text-4xl font-bold text-blue-400 mt-2">{classStudents.length}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-sm font-semibold text-gray-400">Pending Submissions</h3>
                    <p className="text-4xl font-bold text-yellow-400 mt-2">{pendingSubmissions}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <h3 className="text-sm font-semibold text-gray-400">Open Enquiries</h3>
                    <p className="text-4xl font-bold text-red-400 mt-2">{openEnquiries}</p>
                </div>
            </div>
        </div>
    );
};

(StudentsTab as React.FC<any>) = ({ classStudents, setActiveTab, setViewingStudentId }) => {
    const handleViewProgress = (studentId: string) => {
        setViewingStudentId(studentId);
        setActiveTab('reports');
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-white mb-6">Students ({classStudents.length})</h2>
            <div className="overflow-x-auto bg-gray-700/50 rounded-lg">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-600">
                        <tr>
                            <th className="p-3">Full Name</th>
                            <th className="p-3">Joined On</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classStudents.map((student: Student) => (
                            <tr key={student.id} className="border-b border-gray-700 last:border-none hover:bg-gray-700">
                                <td className="p-3 font-medium">{student.fullName}</td>
                                <td className="p-3 text-gray-400">{new Date(parseInt(student.id.split('-')[1])).toLocaleDateString()}</td>
                                <td className="p-3">
                                    <button onClick={() => handleViewProgress(student.id)} className="text-blue-400 hover:underline text-sm">View Progress</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {classStudents.length === 0 && <p className="text-center text-gray-500 py-8">No students have joined this class yet.</p>}
            </div>
        </div>
    );
};

(QuestionBankTab as React.FC<any>) = ({ questionBank, setQuestionBank }) => {
    const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);

    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [editingFolder, setEditingFolder] = useState<QuestionBankFolder | null>(null);
    const [newFolderName, setNewFolderName] = useState('');
    
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<{ question: Question; folderId: string; } | null>(null);
    const [targetFolderForNewQuestion, setTargetFolderForNewQuestion] = useState<string | null>(null);
    const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
    
    const handleOpenFolderModal = (folder: QuestionBankFolder | null) => {
        setEditingFolder(folder);
        setNewFolderName(folder ? folder.name : '');
        setIsFolderModalOpen(true);
    };

    const handleSaveFolder = () => {
        if (!newFolderName.trim()) return;

        if (editingFolder) {
            setQuestionBank((prev: QuestionBankFolder[]) =>
                prev.map(f => (f.id === editingFolder.id ? { ...f, name: newFolderName } : f))
            );
        } else {
            const newFolder: QuestionBankFolder = {
                id: `folder-${Date.now()}`,
                name: newFolderName,
                questions: [],
            };
            setQuestionBank((prev: QuestionBankFolder[]) => [...prev, newFolder]);
        }
        setIsFolderModalOpen(false);
        setNewFolderName('');
        setEditingFolder(null);
    };

    const handleDeleteFolder = (folderId: string) => {
        if (window.confirm('Are you sure you want to delete this folder and all questions inside it?')) {
            setQuestionBank((prev: QuestionBankFolder[]) => prev.filter(f => f.id !== folderId));
        }
    };
    
    const handleOpenQuestionModal = (question: Question | null, folderId: string) => {
        if (question) {
            setEditingQuestion({ question, folderId });
        } else {
            setEditingQuestion(null);
            setTargetFolderForNewQuestion(folderId);
        }
        setIsQuestionModalOpen(true);
    };

    const handleSaveQuestion = (question: Question) => {
        if (editingQuestion) {
            setQuestionBank((prev: QuestionBankFolder[]) => prev.map(folder => 
                folder.id === editingQuestion.folderId
                    ? { ...folder, questions: folder.questions.map(q => q.id === question.id ? question : q) }
                    : folder
            ));
        } else if (targetFolderForNewQuestion) {
            setQuestionBank((prev: QuestionBankFolder[]) => prev.map(folder =>
                folder.id === targetFolderForNewQuestion
                    ? { ...folder, questions: [...folder.questions, question] }
                    : folder
            ));
        }
        setIsQuestionModalOpen(false);
        setEditingQuestion(null);
        setTargetFolderForNewQuestion(null);
    };
    
    const handleDeleteQuestion = (questionId: string, folderId: string) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            setQuestionBank((prev: QuestionBankFolder[]) => prev.map(folder =>
                folder.id === folderId
                    ? { ...folder, questions: folder.questions.filter(q => q.id !== questionId) }
                    : folder
            ));
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Question Bank</h2>
                <button onClick={() => handleOpenFolderModal(null)} className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-800">
                    <FolderPlusIcon className="w-5 h-5"/>
                    <span>Create Folder</span>
                </button>
            </div>
            
            <div className="space-y-3">
                {questionBank.length > 0 ? questionBank.map((folder: QuestionBankFolder) => (
                    <div key={folder.id} className="bg-gray-700 rounded-lg">
                        <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setExpandedFolderId(expandedFolderId === folder.id ? null : folder.id)}>
                            <div className="flex items-center">
                                <FolderIcon className="w-6 h-6 mr-3 text-accent"/>
                                <div>
                                    <p className="font-bold text-white">{folder.name}</p>
                                    <p className="text-sm text-gray-400">{folder.questions.length} question(s)</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button onClick={(e) => { e.stopPropagation(); handleOpenFolderModal(folder); }} className="p-1 text-gray-400 hover:text-blue-400" title="Rename Folder"><EditIcon className="w-5 h-5"/></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="p-1 text-gray-400 hover:text-red-400" title="Delete Folder"><Trash2Icon className="w-5 h-5"/></button>
                                <ChevronDownIcon className={`w-6 h-6 transition-transform ${expandedFolderId === folder.id ? 'rotate-180' : ''}`} />
                            </div>
                        </div>
                        {expandedFolderId === folder.id && (
                            <div className="p-4 border-t border-gray-600">
                                <div className="mb-4 flex space-x-2">
                                    <button onClick={() => handleOpenQuestionModal(null, folder.id)} className="flex items-center space-x-2 bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">
                                        <PlusCircleIcon className="w-4 h-4"/>
                                        <span>Add Manually</span>
                                    </button>
                                    <button onClick={() => { setTargetFolderForNewQuestion(folder.id); setIsAiGeneratorOpen(true); }} className="flex items-center space-x-2 bg-secondary text-white px-3 py-1 rounded text-sm hover:bg-emerald-600">
                                        <Wand2Icon className="w-4 h-4"/>
                                        <span>Generate with AI</span>
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {folder.questions.length > 0 ? folder.questions.map((q: Question) => (
                                        <div key={q.id} className="p-3 bg-gray-800 rounded-md">
                                            <p className="text-sm font-semibold text-gray-300 truncate">({q.type}) {q.text}</p>
                                            <p className="text-xs text-gray-400 mt-1">Answer: {q.correctAnswer}</p>
                                            <div className="flex justify-end space-x-2 mt-2">
                                                <button onClick={() => handleOpenQuestionModal(q, folder.id)} className="p-1 text-gray-400 hover:text-blue-400" title="Edit Question"><EditIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeleteQuestion(q.id, folder.id)} className="p-1 text-gray-400 hover:text-red-400" title="Delete Question"><Trash2Icon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                    )) : <p className="text-center text-gray-500 text-sm py-4">This folder is empty. Add a question to get started.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="text-center p-8 bg-gray-700/50 rounded-lg">
                        <p className="text-gray-400">Your Question Bank is empty.</p>
                        <p className="text-gray-400">Create a folder to start adding questions.</p>
                    </div>
                )}
            </div>

            {isFolderModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
                    <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-md">
                        <h2 className="text-xl font-bold mb-4 text-white">{editingFolder ? 'Rename Folder' : 'Create New Folder'}</h2>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded text-white"
                            placeholder="Enter folder name..."
                            autoFocus
                        />
                        <div className="mt-6 flex justify-end space-x-3">
                            <button onClick={() => setIsFolderModalOpen(false)} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                            <button onClick={handleSaveFolder} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-800">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {isAiGeneratorOpen && targetFolderForNewQuestion && (
                <AIQuestionGeneratorModal 
                    onSave={(newQuestions) => {
                        setQuestionBank((prev: QuestionBankFolder[]) => prev.map(folder => {
                            if (folder.id === targetFolderForNewQuestion) {
                                const questionsToAdd = newQuestions.map((q, i) => ({
                                    ...q,
                                    id: `q-${Date.now()}-${folder.questions.length + i}`,
                                    source: 'ai' as 'ai',
                                }));
                                return { ...folder, questions: [...folder.questions, ...questionsToAdd] };
                            }
                            return folder;
                        }));
                        setIsAiGeneratorOpen(false);
                        setTargetFolderForNewQuestion(null);
                    }}
                    onClose={() => {
                        setIsAiGeneratorOpen(false);
                        setTargetFolderForNewQuestion(null);
                    }}
                />
            )}

            {isQuestionModalOpen && (
                <QuestionModal 
                    question={editingQuestion ? editingQuestion.question : null}
                    onSave={handleSaveQuestion}
                    onClose={() => setIsQuestionModalOpen(false)}
                />
            )}
        </div>
    );
};

const QuestionBankImporter: React.FC<{
    questionBank: QuestionBankFolder[];
    onImport: (questions: Question[]) => void;
    onClose: () => void;
}> = ({ questionBank, onImport, onClose }) => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Record<string, boolean>>({});

    const selectedFolder = useMemo(() => questionBank.find(f => f.id === selectedFolderId), [questionBank, selectedFolderId]);

    const handleToggleQuestion = (questionId: string) => {
        setSelectedQuestionIds(prev => ({ ...prev, [questionId]: !prev[questionId] }));
    };

    const handleImportClick = () => {
        const questionsToImport = questionBank
            .flatMap(folder => folder.questions)
            .filter(q => selectedQuestionIds[q.id]);
        onImport(questionsToImport);
        onClose();
    };

    const questionsInFolder = selectedFolder?.questions || [];
    const allInFolderSelected = questionsInFolder.length > 0 && questionsInFolder.every(q => selectedQuestionIds[q.id]);

    const handleSelectAllInFolder = () => {
        const newSelectedIds = { ...selectedQuestionIds };
        questionsInFolder.forEach(q => {
            newSelectedIds[q.id] = !allInFolderSelected;
        });
        setSelectedQuestionIds(newSelectedIds);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-white">Import Questions from Bank</h2>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
                    <div className="md:col-span-1 bg-gray-700/50 rounded-lg p-2 overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-300 p-2">Folders</h3>
                        <ul>
                            {questionBank.map(folder => (
                                <li key={folder.id}>
                                    <button
                                        onClick={() => setSelectedFolderId(folder.id)}
                                        className={`w-full text-left p-2 rounded my-1 text-sm ${selectedFolderId === folder.id ? 'bg-primary text-white' : 'hover:bg-gray-700'}`}
                                    >
                                        <p className="font-semibold">{folder.name}</p>
                                        <p className="text-xs opacity-70">{folder.questions.length} questions</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="md:col-span-2 bg-gray-700/50 rounded-lg p-2 flex flex-col overflow-y-auto">
                        {selectedFolder ? (
                            <>
                                <div className="p-2 flex justify-between items-center border-b border-gray-600 mb-2">
                                    <h3 className="text-lg font-semibold text-gray-300">{selectedFolder.name}</h3>
                                    {questionsInFolder.length > 0 && (
                                        <label className="flex items-center text-sm">
                                            <input type="checkbox" checked={allInFolderSelected} onChange={handleSelectAllInFolder} className="mr-2" />
                                            Select All
                                        </label>
                                    )}
                                </div>
                                <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                                {questionsInFolder.map(q => (
                                    <div key={q.id} className="bg-gray-800 p-3 rounded">
                                        <label className="flex items-start">
                                            <input type="checkbox" checked={!!selectedQuestionIds[q.id]} onChange={() => handleToggleQuestion(q.id)} className="mr-3 mt-1" />
                                            <div>
                                                <p className="text-sm font-semibold text-gray-300">({q.type}) {q.text}</p>
                                                <p className="text-xs text-gray-400 mt-1">Answer: {q.correctAnswer}</p>
                                            </div>
                                        </label>
                                    </div>
                                ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">Select a folder to view questions.</div>
                        )}
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500">Cancel</button>
                    <button type="button" onClick={handleImportClick} disabled={Object.values(selectedQuestionIds).every(v => !v)} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-800 disabled:opacity-50">
                        Import Selected Questions
                    </button>
                </div>
            </div>
        </div>
    );
};

const QuizCreator: React.FC<{
    onSave: (quiz: Quiz) => void;
    onCancel: () => void;
    existingQuiz: Quiz | null;
    classId: string;
    questionBank: QuestionBankFolder[];
}> = ({ onSave, onCancel, existingQuiz, classId, questionBank }) => {
    const [quiz, setQuiz] = useState<Quiz>(existingQuiz || {
        id: `quiz-${Date.now()}`,
        classId,
        title: '',
        topic: '',
        category: QuizCategory.Classwork,
        questions: [],
        status: 'draft',
        feedbackTiming: 'endOfQuiz',
        isExamMode: false,
        reshuffleQuestions: false,
        reshuffleAnswers: false,
        allowMultipleSubmissions: false,
        maxSubmissions: 1,
    });

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showBankImporter, setShowBankImporter] = useState(false);
    const [isDueDateEnabled, setIsDueDateEnabled] = useState(!!existingQuiz?.dueDate);
    
    // AI State
    const [aiPrompt, setAiPrompt] = useState('');
    const [numMcq, setNumMcq] = useState(2);
    const [numTf, setNumTf] = useState(2);
    const [numEssay, setNumEssay] = useState(1);
    const [reviewingQuestions, setReviewingQuestions] = useState<Question[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiError, setAiError] = useState('');

    const handleQuizChange = (field: keyof Quiz, value: any) => {
        setQuiz(prev => ({ ...prev, [field]: value }));
    };
    
    const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...quiz.questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuiz(prev => ({...prev, questions: newQuestions}));
    };

    const addQuestion = (type: QuestionType) => {
        const newQuestion: Question = {
            id: `q-${Date.now()}-${quiz.questions.length}`,
            type,
            text: '',
            options: type === QuestionType.MultipleChoice ? ['', '', '', ''] : undefined,
            correctAnswer: '',
            explanation: '',
            totalMarks: 10,
            source: 'manual',
        };
        setQuiz(prev => ({...prev, questions: [...prev.questions, newQuestion]}));
    };
    
    const removeQuestion = (index: number) => {
        setQuiz(prev => ({...prev, questions: prev.questions.filter((_, i) => i !== index)}));
    };

    const handleGenerateQuestions = async () => {
        if (!aiPrompt.trim()) {
            setAiError("Please enter a topic or prompt.");
            return;
        }
        const totalQuestions = numMcq + numTf + numEssay;
        if (totalQuestions <= 0) {
            setAiError("Please specify a number of questions greater than zero.");
            return;
        }

        setIsGenerating(true);
        setAiError('');
        setReviewingQuestions([]);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API_KEY environment variable not set.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const fullPrompt = `Generate a total of ${totalQuestions} quiz questions for school students on the topic: "${aiPrompt}".
The questions should be broken down as follows:
- ${numMcq} Multiple Choice questions.
- ${numTf} True/False questions.
- ${numEssay} Essay questions.

For each question, provide a JSON object with the following fields:
- "text": The question itself.
- "type": The question type ("Multiple Choice", "True/False", or "Essay").
- "options": For "Multiple Choice" ONLY, an array of 4 strings. This field must be omitted for other types.
- "correctAnswer": The correct answer. For "Multiple Choice", it must match one of the options. For "True/False", it must be "True" or "False". For "Essay", provide a model answer.
- "explanation": An explanation of the correct answer. For "Essay", explain the grading criteria.
- "totalMarks": An integer between 5 and 20.

The final output must be a single, valid JSON array of these question objects.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: fullPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING },
                                type: { type: Type.STRING, enum: Object.values(QuestionType) },
                                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                                correctAnswer: { type: Type.STRING },
                                explanation: { type: Type.STRING },
                                totalMarks: { type: Type.NUMBER },
                            },
                            required: ['text', 'type', 'correctAnswer', 'explanation', 'totalMarks']
                        },
                    },
                },
            });

            const generatedQuestions: Omit<Question, 'id' | 'source'>[] = JSON.parse(response.text || '[]');
            const newQuestions: Question[] = generatedQuestions.map((q, i) => ({
                ...q,
                id: `q-ai-${Date.now()}-${i}`,
                source: 'ai',
            }));
            setReviewingQuestions(newQuestions);

        } catch (error) {
            console.error("AI question generation failed:", error);
            setAiError("Failed to generate questions. Please check your prompt or API key setup.");
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleApproveQuestion = (questionToApprove: Question) => {
        const approvedQuestion = { ...questionToApprove, id: `q-${Date.now()}-${quiz.questions.length}` };
        setQuiz(prev => ({ ...prev, questions: [...prev.questions, approvedQuestion] }));
        setReviewingQuestions(prev => prev.filter(q => q.id !== questionToApprove.id));
    };

    const handleDeclineQuestion = (questionId: string) => {
        setReviewingQuestions(prev => prev.filter(q => q.id !== questionId));
    };

    const handleApproveAll = () => {
        const approvedQuestions = reviewingQuestions.map((q, i) => ({
             ...q, 
             id: `q-${Date.now()}-${quiz.questions.length + i}` 
        }));
        setQuiz(prev => ({ ...prev, questions: [...prev.questions, ...approvedQuestions] }));
        setReviewingQuestions([]);
    };
    
    const handleTimerChange = (field: 'isEnabled' | 'mode' | 'duration', value: any) => {
        const newTimer = { ...(quiz.timer || { isEnabled: false, mode: 'entireQuiz', duration: 600 }) };

        if (field === 'duration') {
            if (newTimer.mode === 'entireQuiz') {
                newTimer.duration = Number(value) * 60; 
            } else { 
                newTimer.duration = Number(value); 
            }
        } else {
            (newTimer as any)[field] = value;
        }

        setQuiz(prev => ({ ...prev, timer: newTimer }));
    };

    const handleImportFromBank = (importedQuestions: Question[]) => {
        const newQuestions = importedQuestions.map((q, i) => ({
            ...q,
            id: `q-bank-${Date.now()}-${i}` 
        }));
        setQuiz(prev => ({ ...prev, questions: [...prev.questions, ...newQuestions]}));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            {showBankImporter && <QuestionBankImporter questionBank={questionBank} onImport={handleImportFromBank} onClose={() => setShowBankImporter(false)} />}
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-white">{existingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</h2>
                <div className="flex-grow overflow-y-auto pr-2">
                    <fieldset className="border border-gray-600 p-4 rounded-lg">
                        <legend className="px-2 text-lg font-semibold text-white">Basic Options</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400">Title</label>
                                <input type="text" value={quiz.title} onChange={e => handleQuizChange('title', e.target.value)} className="mt-1 w-full bg-gray-700 p-2 rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400">Topic</label>
                                <input type="text" value={quiz.topic} onChange={e => handleQuizChange('topic', e.target.value)} className="mt-1 w-full bg-gray-700 p-2 rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400">Category</label>
                                <select value={quiz.category} onChange={e => handleQuizChange('category', e.target.value)} className="mt-1 w-full bg-gray-700 p-2 rounded">
                                    {Object.values(QuizCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-400">Status</label>
                                <select value={quiz.status} onChange={e => handleQuizChange('status', e.target.value)} className="mt-1 w-full bg-gray-700 p-2 rounded">
                                    <option value="draft">Draft</option>
                                    <option value="active">Active</option>
                                    <option value="scheduled">Scheduled</option>
                                </select>
                            </div>
                        </div>
                    </fieldset>
                    
                     <div className="mt-4 border border-gray-600 rounded-lg">
                        <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex justify-between items-center p-4">
                            <span className="text-lg font-semibold text-white">Advanced Options</span>
                            <ChevronDownIcon className={`w-6 h-6 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                        </button>
                        {showAdvanced && (
                             <div className="p-4 border-t border-gray-600 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400">Feedback Timing</label>
                                    <select value={quiz.feedbackTiming} onChange={e => handleQuizChange('feedbackTiming', e.target.value)} className="mt-1 w-full bg-gray-700 p-2 rounded">
                                        <option value="endOfQuiz">At the end of the quiz</option>
                                        <option value="immediate">Immediately after each question</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400">Scheduling & Attempts</label>
                                    <input type="datetime-local" value={quiz.scheduledFor ? new Date(quiz.scheduledFor).toISOString().slice(0, 16) : ''} onChange={e => handleQuizChange('scheduledFor', new Date(e.target.value).getTime())} className="mt-1 w-full bg-gray-700 p-2 rounded" disabled={quiz.status !== 'scheduled'} />
                                    
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <label className="flex items-center text-sm font-medium text-gray-400">
                                                <input type="checkbox" checked={quiz.allowMultipleSubmissions} onChange={e => handleQuizChange('allowMultipleSubmissions', e.target.checked)} className="mr-2" />
                                                Allow Multiple Submissions
                                            </label>
                                            {quiz.allowMultipleSubmissions && (
                                                <div className="mt-2 pl-6 space-y-2 border-l-2 border-accent">
                                                    <label className="flex items-center text-sm">
                                                        <input type="checkbox" checked={quiz.maxSubmissions === 0} onChange={e => handleQuizChange('maxSubmissions', e.target.checked ? 0 : 2)} className="mr-2" />
                                                        Unlimited Submissions
                                                    </label>
                                                    {quiz.maxSubmissions !== 0 && (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm text-gray-400">Max Submissions:</span>
                                                            <input 
                                                                type="number" 
                                                                min="1" 
                                                                value={quiz.maxSubmissions || 1} 
                                                                onChange={e => handleQuizChange('maxSubmissions', parseInt(e.target.value) || 1)} 
                                                                className="w-20 bg-gray-700 p-1 rounded" 
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="flex items-center">
                                                <input type="checkbox" checked={isDueDateEnabled} onChange={e => {
                                                    const checked = e.target.checked;
                                                    setIsDueDateEnabled(checked);
                                                    if (!checked) {
                                                        handleQuizChange('dueDate', undefined);
                                                    }
                                                }} className="mr-2" />
                                                Set a Due Date
                                            </label>
                                            {isDueDateEnabled && (
                                                <input type="datetime-local" value={quiz.dueDate ? new Date(quiz.dueDate).toISOString().slice(0, 16) : ''} onChange={e => handleQuizChange('dueDate', new Date(e.target.value).getTime())} className="w-full bg-gray-600 p-2 rounded" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <label className="flex items-center"><input type="checkbox" checked={quiz.isExamMode} onChange={e => handleQuizChange('isExamMode', e.target.checked)} className="mr-2" /> Exam Mode (results hidden until manually graded)</label>
                                    <label className="flex items-center"><input type="checkbox" checked={quiz.reshuffleQuestions} onChange={e => handleQuizChange('reshuffleQuestions', e.target.checked)} className="mr-2" /> Reshuffle Questions</label>
                                    <label className="flex items-center"><input type="checkbox" checked={quiz.reshuffleAnswers} onChange={e => handleQuizChange('reshuffleAnswers', e.target.checked)} className="mr-2" /> Reshuffle Answers (for MCQs)</label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400">Timer</label>
                                    <div className="mt-1 bg-gray-700 p-2 rounded">
                                        <label className="flex items-center mb-2"><input type="checkbox" checked={quiz.timer?.isEnabled} onChange={e => handleTimerChange('isEnabled', e.target.checked)} className="mr-2" /> Enable Timer</label>
                                        {quiz.timer?.isEnabled && (
                                            <div className="space-y-2 pl-2 border-l-2 border-gray-600">
                                                <select value={quiz.timer.mode} onChange={e => handleTimerChange('mode', e.target.value)} className="w-full bg-gray-600 p-1 rounded">
                                                    <option value="entireQuiz">For Entire Quiz</option>
                                                    <option value="perQuestion">Per Question</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    value={quiz.timer.mode === 'entireQuiz' ? (quiz.timer.duration / 60) : quiz.timer.duration}
                                                    onChange={e => handleTimerChange('duration', e.target.value)}
                                                    min="1"
                                                    className="w-full bg-gray-600 p-1 rounded"
                                                    placeholder={quiz.timer.mode === 'entireQuiz' ? 'Duration in minutes' : 'Duration in seconds'}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                     </div>

                    <div className="my-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-accent flex items-center"><Wand2Icon className="w-5 h-5 mr-2" /> Generate Questions with AI</h3>
                            <button onClick={() => setShowBankImporter(true)} className="flex items-center space-x-2 text-sm bg-gray-600 px-3 py-1 rounded hover:bg-gray-500">
                                <ArchiveIcon className="w-4 h-4" />
                                <span>Import from Question Bank</span>
                            </button>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">Describe the topic and specify the number of questions for each type.</p>
                        <input
                            type="text"
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                            placeholder="e.g., Photosynthesis for 10th graders"
                            className="w-full bg-gray-600 p-2 rounded"
                            disabled={isGenerating}
                        />
                        <div className="flex items-end gap-4 mt-2">
                            <div className="flex-1">
                                <label className="text-xs text-gray-400">Multiple Choice</label>
                                <input type="number" value={numMcq} onChange={e => setNumMcq(Math.max(0, parseInt(e.target.value)))} min="0" className="w-full bg-gray-600 p-2 rounded" disabled={isGenerating} />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-400">True/False</label>
                                <input type="number" value={numTf} onChange={e => setNumTf(Math.max(0, parseInt(e.target.value)))} min="0" className="w-full bg-gray-600 p-2 rounded" disabled={isGenerating} />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-400">Essay</label>
                                <input type="number" value={numEssay} onChange={e => setNumEssay(Math.max(0, parseInt(e.target.value)))} min="0" className="w-full bg-gray-600 p-2 rounded" disabled={isGenerating} />
                            </div>
                            <button onClick={handleGenerateQuestions} disabled={isGenerating} className="bg-secondary text-white px-4 py-2 rounded hover:bg-emerald-600 disabled:opacity-50 h-10">
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                         {aiError && <p className="text-red-500 text-sm mt-2">{aiError}</p>}
                    </div>

                    {reviewingQuestions.length > 0 && (
                        <div className="my-6 p-4 bg-gray-900 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-green-400">Review AI-Generated Questions</h3>
                                <button onClick={handleApproveAll} className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-500">
                                    Approve All
                                </button>
                            </div>
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                {reviewingQuestions.map(q => (
                                    <div key={q.id} className="p-3 bg-gray-800 rounded-md">
                                        <p className="font-semibold text-gray-300">({q.type}) {q.text}</p>
                                        {q.options && q.type === QuestionType.MultipleChoice && (
                                            <ul className="list-disc list-inside text-sm text-gray-400 mt-1 pl-2">
                                                {q.options.map((opt, i) => <li key={i}>{opt}</li>)}
                                            </ul>
                                        )}
                                        <p className="text-sm mt-1">
                                            <span className="font-semibold text-gray-400">Answer: </span>
                                            <span className="text-green-400">{q.correctAnswer}</span>
                                        </p>
                                        <div className="flex justify-end space-x-2 mt-2">
                                            <button onClick={() => handleDeclineQuestion(q.id)} className="flex items-center space-x-1 px-2 py-1 text-xs bg-red-800 text-white rounded hover:bg-red-700">
                                                <XIcon className="w-3 h-3"/><span>Decline</span>
                                            </button>
                                            <button onClick={() => handleApproveQuestion(q)} className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600">
                                                <CheckIcon className="w-3 h-3"/><span>Approve</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Quiz Questions ({quiz.questions.length})</h3>
                        {quiz.questions.map((q, i) => (
                            <div key={q.id} className="p-4 bg-gray-700 rounded-lg">
                               <div className="flex justify-between items-start">
                                    <p className="font-semibold text-gray-300 mb-2">Question {i+1} ({q.type}) {q.source === 'ai' && <Wand2Icon className="w-4 h-4 inline-block ml-2 text-accent" title="Generated by AI" />}</p>
                                    <button onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-300"><Trash2Icon className="w-5 h-5"/></button>
                               </div>
                               <textarea value={q.text} onChange={e => handleQuestionChange(i, 'text', e.target.value)} rows={2} className="w-full bg-gray-600 p-2 rounded mb-2" placeholder="Question text..."/>
                               {q.type === QuestionType.MultipleChoice && q.options?.map((opt, optIndex) => (
                                   <div key={optIndex} className="flex items-center gap-2 mb-1">
                                       <input type="radio" name={`correct-${q.id}`} checked={q.correctAnswer === opt} onChange={() => handleQuestionChange(i, 'correctAnswer', opt)} />
                                       <input type="text" value={opt} onChange={e => {
                                           const newOpts = [...q.options!]; newOpts[optIndex] = e.target.value;
                                           handleQuestionChange(i, 'options', newOpts);
                                       }} className="flex-grow bg-gray-600 p-1 rounded" />
                                   </div>
                               ))}
                                {q.type === QuestionType.TrueFalse && (
                                    <div>
                                        <label className="mr-4"><input type="radio" name={`correct-${q.id}`} checked={q.correctAnswer === 'True'} onChange={() => handleQuestionChange(i, 'correctAnswer', 'True')} /> True</label>
                                        <label><input type="radio" name={`correct-${q.id}`} checked={q.correctAnswer === 'False'} onChange={() => handleQuestionChange(i, 'correctAnswer', 'False')} /> False</label>
                                    </div>
                                )}
                                {q.type === QuestionType.Essay && (
                                    <textarea value={q.correctAnswer || ''} onChange={e => handleQuestionChange(i, 'correctAnswer', e.target.value)} rows={3} className="w-full bg-gray-600 p-2 rounded mb-2" placeholder="Model answer or grading guidelines..."/>
                                )}
                                <textarea value={q.explanation || ''} onChange={e => handleQuestionChange(i, 'explanation', e.target.value)} rows={2} className="w-full bg-gray-600 p-2 rounded mt-2" placeholder="Explanation for correct answer..."/>
                                <input type="number" value={q.totalMarks} onChange={e => handleQuestionChange(i, 'totalMarks', parseInt(e.target.value))} className="w-24 bg-gray-600 p-1 rounded mt-2" placeholder="Marks" />
                            </div>
                        ))}
                         <div className="flex space-x-2">
                             <button onClick={() => addQuestion(QuestionType.MultipleChoice)} className="text-sm bg-gray-600 px-3 py-1 rounded hover:bg-gray-500">Add Multiple Choice</button>
                             <button onClick={() => addQuestion(QuestionType.TrueFalse)} className="text-sm bg-gray-600 px-3 py-1 rounded hover:bg-gray-500">Add True/False</button>
                             <button onClick={() => addQuestion(QuestionType.Essay)} className="text-sm bg-gray-600 px-3 py-1 rounded hover:bg-gray-500">Add Essay</button>
                         </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500">Cancel</button>
                    <button type="button" onClick={() => onSave(quiz)} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-800">Save Quiz</button>
                </div>
            </div>
        </div>
    );
};

const QuizPreviewer: React.FC<{
  quiz: Quiz;
  onBack: () => void;
}> = ({ quiz, onBack }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
    const [view, setView] = useState<'taking' | 'finished'>('taking');
    const [immediateFeedback, setImmediateFeedback] = useState<{ [questionId: string]: boolean | null }>({});
    const [submittedAnswers, setSubmittedAnswers] = useState<{ [questionId: string]: boolean }>({});
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);
    const [showEssayConfirm, setShowEssayConfirm] = useState(false);

    if (!quiz.questions || quiz.questions.length === 0) {
        return (
            <div className="text-center p-8 bg-gray-800 rounded-lg">
                <HelpCircleIcon className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
                <h2 className="text-2xl font-bold text-white">Quiz Unavailable</h2>
                <p className="text-gray-400 mt-2">This quiz has no questions. Please add questions to preview.</p>
                <button onClick={onBack} className="mt-6 bg-primary text-white px-6 py-2 rounded-md hover:bg-blue-800">Back to Quizzes</button>
            </div>
        );
    }

    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    const handleQuizSubmitRef = useRef<(() => void) | null>(null);
    const handleNextRef = useRef<(() => void) | null>(null);

    handleQuizSubmitRef.current = () => {
        setView('finished');
    };

    handleNextRef.current = () => {
        if (currentQuestionIndex === quiz.questions.length - 1) {
            handleQuizSubmitRef.current?.();
        } else if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };
    
    useEffect(() => {
        if (!quiz.timer?.isEnabled || quiz.timer.mode !== 'entireQuiz') return;

        setTimeLeft(quiz.timer.duration);
        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev !== null && prev > 1) return prev - 1;
                clearInterval(timerId);
                handleQuizSubmitRef.current?.();
                return 0;
            });
        }, 1000);
        return () => clearInterval(timerId);
    }, [quiz.id, quiz.timer]);

    useEffect(() => {
        if (!quiz.timer?.isEnabled || quiz.timer.mode !== 'perQuestion') return;

        setTimeLeft(quiz.timer.duration);
        const timerId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev !== null && prev > 1) return prev - 1;
                clearInterval(timerId);
                handleNextRef.current?.();
                return 0;
            });
        }, 1000);
        return () => clearInterval(timerId);
    }, [quiz.id, quiz.timer, currentQuestionIndex]);


    const handleAnswerSelect = (questionId: string, answer: string) => {
        const newAnswers = { ...answers, [questionId]: answer };
        setAnswers(newAnswers);
    };
    
    const handleSubmitAnswer = (questionId: string) => {
        const question = quiz.questions.find(q => q.id === questionId);
        if (!question) return;
    
        if (question.type === QuestionType.Essay) {
            setShowEssayConfirm(true);
            return; 
        }
        
        setSubmittedAnswers(prev => ({ ...prev, [questionId]: true }));
        const isCorrect = question.correctAnswer === answers[questionId];
        setImmediateFeedback(prev => ({ ...prev, [questionId]: isCorrect }));
    };

    const handleConfirmEssaySubmit = (questionId: string) => {
        setSubmittedAnswers(prev => ({ ...prev, [questionId]: true }));
        setImmediateFeedback(prev => ({ ...prev, [questionId]: null }));
        setShowEssayConfirm(false);
    };

    const handleAttemptSubmit = () => {
        setIsConfirmingSubmit(true);
    };

    const confirmSubmission = () => {
        handleQuizSubmitRef.current?.();
    };

    const cancelSubmission = () => {
        setIsConfirmingSubmit(false);
    };

    const handleNext = () => {
        handleNextRef.current?.();
    };
    
    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    if (view === 'finished') {
        return (
            <div className="text-center p-8 bg-gray-800 rounded-lg">
                <EyeIcon className="w-16 h-16 mx-auto text-blue-400 mb-4" />
                <h2 className="text-2xl font-bold text-white">Quiz Preview Ended</h2>
                <p className="text-gray-400 mt-2">You have reached the end of the quiz preview.</p>
                <button onClick={onBack} className="mt-6 bg-primary text-white px-6 py-2 rounded-md hover:bg-blue-800">Back to Quizzes</button>
            </div>
        );
    }
    
    const question = quiz.questions[currentQuestionIndex];
    const feedback = immediateFeedback[question.id];
    const isAnswered = answers[question.id] !== undefined && (question.type === QuestionType.Essay ? answers[question.id].trim() !== '' : answers[question.id] !== '');
    const isSubmittedForFeedback = !!submittedAnswers[question.id];

    return (
        <div>
            {showEssayConfirm && question.type === QuestionType.Essay && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 shadow-xl text-center">
                        <h3 className="text-xl font-bold text-white">Confirm Submission</h3>
                        <p className="text-gray-400 mt-2 mb-6">Are you sure you want to submit this essay?<br/>You cannot change your answer after submitting.</p>
                        <div className="flex justify-center space-x-4">
                            <button onClick={() => setShowEssayConfirm(false)} className="px-6 py-2 font-bold rounded-md bg-gray-600 hover:bg-gray-500 text-white transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => handleConfirmEssaySubmit(question.id)} className="px-6 py-2 font-bold rounded-md bg-secondary hover:bg-emerald-600 text-white transition-colors">
                                Yes, Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">{quiz.title}</h2>
                <div className="flex items-center space-x-4">
                    {timeLeft !== null && (
                        <span className="font-mono text-lg bg-red-800 text-white px-3 py-1 rounded-md flex items-center">
                            <ClockIcon className="w-4 h-4 mr-2"/>
                            {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                    )}
                    <span className="font-mono text-sm bg-gray-700 px-3 py-1 rounded-full text-white">
                        Question {currentQuestionIndex + 1} / {quiz.questions.length}
                    </span>
                </div>
            </div>
            
            <div className="p-6 bg-gray-800 rounded-lg">
                <p className="text-lg font-semibold mb-4 text-white">{question.text}</p>
                <div className="space-y-3">
                    {question.type === QuestionType.MultipleChoice && question.options?.map(option => (
                        <button key={option}
                            onClick={() => handleAnswerSelect(question.id, option)}
                            disabled={isSubmittedForFeedback}
                            className={`w-full text-left p-3 rounded-md border-2 transition-colors text-white ${answers[question.id] === option ? 'bg-blue-800 border-blue-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'} disabled:cursor-not-allowed`}
                        >
                            {option}
                        </button>
                    ))}
                     {question.type === QuestionType.TrueFalse && ['True', 'False'].map(option => (
                        <button key={option}
                            onClick={() => handleAnswerSelect(question.id, option)}
                            disabled={isSubmittedForFeedback}
                            className={`w-full text-left p-3 rounded-md border-2 transition-colors text-white ${answers[question.id] === option ? 'bg-blue-800 border-blue-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'} disabled:cursor-not-allowed`}
                        >
                            {option}
                        </button>
                    ))}
                    {question.type === QuestionType.Essay && (
                        <textarea
                            value={answers[question.id] || ''}
                            onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
                            disabled={isSubmittedForFeedback}
                            rows={6}
                            className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 disabled:cursor-not-allowed"
                            placeholder="Type your answer here..."
                        />
                    )}
                </div>
                 {feedback !== undefined && quiz.feedbackTiming === 'immediate' && (
                    <div className={`mt-4 p-3 rounded-lg text-sm border text-white ${feedback === true ? 'bg-green-900/50 border-green-700' : feedback === false ? 'bg-red-900/50 border-red-700' : 'bg-blue-900/50 border-blue-700'}`}>
                        {feedback === true && <p className="font-bold">Correct!</p>}
                        {feedback === false && <p className="font-bold">Incorrect.</p>}
                        {feedback === null && (
                            <>
                                <p className="font-bold">Answer submitted. Your teacher will mark and give you feedback.</p>
                                {question.explanation && <p className="mt-1 text-gray-300">{question.explanation}</p>}
                            </>
                        )}
                        {question.explanation && feedback !== null && <p className="mt-1 text-gray-300">{question.explanation}</p>}
                    </div>
                )}
            </div>

            <div className="mt-6">
                {isConfirmingSubmit ? (
                    <div className="text-center p-6 bg-gray-700 rounded-lg border border-gray-600">
                        <h3 className="text-xl font-bold text-white">Ready to Submit?</h3>
                        <p className="text-gray-400 mt-2 mb-6">You cannot change your answers after submitting.</p>
                        <div className="flex justify-center space-x-4">
                            <button onClick={cancelSubmission} className="px-6 py-2 font-bold rounded-md bg-gray-600 hover:bg-gray-500 text-white transition-colors">
                                Go Back
                            </button>
                            <button onClick={confirmSubmission} className="px-6 py-2 font-bold rounded-md bg-green-600 hover:bg-green-500 text-white transition-colors">
                                Confirm Submission
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-between items-center">
                        {!quiz.disablePrevious && quiz.feedbackTiming !== 'immediate' ? (
                            <button onClick={handlePrev} disabled={currentQuestionIndex === 0} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500 disabled:opacity-50 text-white">Previous</button>
                        ) : <div />}
                        
                        {quiz.feedbackTiming === 'immediate' ? (
                            isSubmittedForFeedback ? (
                                <button 
                                    onClick={isLastQuestion ? handleAttemptSubmit : handleNext}
                                    className={`px-6 py-2 font-bold rounded-md text-white transition-all transform hover:scale-105 ${isLastQuestion ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/30' : 'bg-primary hover:bg-blue-800'}`}
                                >
                                    {isLastQuestion ? 'Submit Task' : 'Next'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSubmitAnswer(question.id)}
                                    disabled={!isAnswered}
                                    className="px-6 py-2 font-bold rounded-md text-white bg-secondary hover:bg-emerald-600 disabled:opacity-50"
                                >
                                    Submit Answer
                                </button>
                            )
                        ) : (
                            <button 
                                onClick={isLastQuestion ? handleAttemptSubmit : handleNext}
                                disabled={quiz.forceSubmission && !isAnswered}
                                className={`px-6 py-2 font-bold rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 ${isLastQuestion ? 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/30' : 'bg-primary hover:bg-blue-800'}`}
                            >
                                {isLastQuestion ? 'Submit Task' : 'Next'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


(QuizzesTab as React.FC<any>) = ({ quizzes, setQuizzes, selectedClass, questionBank }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
    const [previewingQuiz, setPreviewingQuiz] = useState<Quiz | null>(null);

    const handleSaveQuiz = (quiz: Quiz) => {
        if (editingQuiz) {
            setQuizzes((prev: Quiz[]) => prev.map(q => q.id === quiz.id ? quiz : q));
        } else {
            setQuizzes((prev: Quiz[]) => [...prev, quiz]);
        }
        setIsCreating(false);
        setEditingQuiz(null);
    };
    
    const handleDeleteQuiz = (quizId: string) => {
        if(window.confirm('Are you sure you want to delete this quiz? All related submissions will also be lost.')) {
            setQuizzes((prev: Quiz[]) => prev.filter(q => q.id !== quizId));
        }
    };

    if (previewingQuiz) {
        return <QuizPreviewer quiz={previewingQuiz} onBack={() => setPreviewingQuiz(null)} />;
    }

    return (
        <div>
            {isCreating || editingQuiz ? (
                <QuizCreator 
                    onSave={handleSaveQuiz} 
                    onCancel={() => { setIsCreating(false); setEditingQuiz(null); }}
                    existingQuiz={editingQuiz}
                    classId={selectedClass.id}
                    questionBank={questionBank}
                />
            ) : (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">Quizzes</h2>
                        <button onClick={() => setIsCreating(true)} className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-800">
                            <PlusCircleIcon className="w-5 h-5"/>
                            <span>Create Quiz</span>
                        </button>
                    </div>
                    <div className="space-y-3">
                        {quizzes.length > 0 ? quizzes.map((quiz: Quiz) => (
                            <div key={quiz.id} className="p-4 bg-gray-700 rounded-lg">
                               <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-white">{quiz.title}</p>
                                        <p className="text-sm text-gray-400">{quiz.questions.length} questions - {quiz.status}</p>
                                        {quiz.allowMultipleSubmissions && (
                                            <p className="text-xs text-accent">
                                                Multiple Submissions: {quiz.maxSubmissions === 0 ? 'Unlimited' : `Max ${quiz.maxSubmissions}`}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => setPreviewingQuiz(quiz)} className="p-1 text-gray-400 hover:text-green-400" title="Preview Quiz"><EyeIcon className="w-5 h-5"/></button>
                                        <button onClick={() => setEditingQuiz(quiz)} className="p-1 text-gray-400 hover:text-blue-400" title="Edit Quiz"><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDeleteQuiz(quiz.id)} className="p-1 text-gray-400 hover:text-red-400" title="Delete Quiz"><Trash2Icon className="w-5 h-5"/></button>
                                    </div>
                               </div>
                            </div>
                        )) : (
                            <div className="text-center p-8 bg-gray-700/50 rounded-lg">
                                <p className="text-gray-400">No quizzes created for this class yet.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const SubmissionGrader: React.FC<{
    submission: Submission;
    quiz: Quiz;
    student: Student;
    onSave: (submission: Submission) => void;
    onBack: () => void;
}> = ({ submission: initialSubmission, quiz, student, onSave, onBack }) => {
    const [submission, setSubmission] = useState(initialSubmission);
    const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(submission.audioFeedbackUrl || null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleEssayScoreChange = (questionId: string, score: number) => {
        const newScores = { ...submission.essayScores, [questionId]: score };
        setSubmission(prev => ({ ...prev, essayScores: newScores }));
    };
    
    const handleQuestionFeedbackChange = (questionId: string, text: string) => {
        setSubmission(prev => ({
            ...prev,
            questionFeedback: {
                ...(prev.questionFeedback || {}),
                [questionId]: text,
            }
        }));
    };

    const handleOverallFeedbackChange = (text: string) => {
        setSubmission(prev => ({...prev, feedback: text}));
    };

    const handleAudioFeedbackChange = (url: string) => {
        setAudioUrl(url);
        setSubmission(prev => ({...prev, audioFeedbackUrl: url}));
    };
    
    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Your browser does not support microphone access.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                const objectUrl = URL.createObjectURL(audioBlob);
                handleAudioFeedbackChange(objectUrl);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch(err){ console.error(err); alert("Audio recording failed. Error: " + (err as Error).message)}
    };
    
    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const generateFeedback = async (type: 'question' | 'overall', questionId?: string) => {
        const key = questionId || 'overall';
        setAiLoading(prev => ({ ...prev, [key]: true }));
        try {
            if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let prompt = '';

            if (type === 'question' && questionId) {
                const question = quiz.questions.find(q => q.id === questionId);
                if (!question) return;
                const studentAnswer = submission.answers[questionId] || "No answer provided.";
                const isCorrect = studentAnswer === question.correctAnswer;
                const score = question.type === QuestionType.Essay 
                    ? submission.essayScores?.[questionId] ?? 'Not scored' 
                    : (isCorrect ? question.totalMarks : 0);
                
                prompt = `The student was asked the following question worth ${question.totalMarks} marks:\nQ: "${question.text}"\n\n`;
                if(question.type !== QuestionType.Essay) {
                    prompt += `The correct answer is: "${question.correctAnswer}".\n`;
                } else {
                    prompt += `The model answer/grading criteria is: "${question.correctAnswer}".\n`;
                }
                prompt += `The student answered:\n"${studentAnswer}"\n\n`;
                prompt += `The student was awarded ${score} marks.\n\n`;
                prompt += `Based on this, provide brief, constructive, and encouraging feedback for the student for this specific question. Address the student directly.`;
            } else if (type === 'overall') {
                const totalPossibleMarks = quiz.questions.reduce((acc: number, q: Question) => acc + (q.totalMarks || 0), 0);
                const essayScore = Object.values(submission.essayScores || {}).reduce((a: number, b: number) => a + b, 0);
                const totalScore = submission.autoGradeScore + essayScore;
                prompt = `A student completed a quiz titled "${quiz.title}".\n`;
                prompt += `They scored ${totalScore} out of a possible ${totalPossibleMarks}.\n\n`;
                prompt += `Provide overall encouraging and constructive feedback summarizing their performance. Address the student directly. Keep it concise (2-3 sentences).`;
            }
            if(!prompt) return;

            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            const feedbackText = response.text;
            
            if (type === 'question' && questionId) {
                handleQuestionFeedbackChange(questionId, feedbackText);
            } else {
                handleOverallFeedbackChange(feedbackText);
            }
        } catch (error) {
            console.error("AI feedback generation failed:", error);
            alert("Failed to generate AI feedback.");
        } finally {
            setAiLoading(prev => ({ ...prev, [key]: false }));
        }
    };


    const handleSave = () => {
        const essayScore = Object.values(submission.essayScores || {}).reduce((a: number, b: number) => a + b, 0);
        const totalMarks = submission.autoGradeScore + essayScore;
        const finalSubmission = { ...submission, isMarked: true, totalMarks };
        onSave(finalSubmission);
    };

    return (
        <div>
            <button onClick={onBack} className="text-sm text-primary hover:underline mb-4">← Back to Submissions</button>
            <h2 className="text-xl font-bold text-white mb-2">Grading: {quiz.title}</h2>
            <p className="text-gray-400 mb-6">Student: {student.fullName}</p>

            <div className="space-y-4">
                {quiz.questions.map((q, index) => {
                    const userAnswer = submission.answers[q.id] || 'Not Answered';
                    const isAutoGradedCorrect = q.correctAnswer === userAnswer;
                    return (
                        <div key={q.id} className={`p-4 rounded-lg border-l-4 ${q.type === QuestionType.Essay ? 'bg-gray-800 border-blue-500' : isAutoGradedCorrect ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
                            <p className="font-semibold text-white">Q{index + 1}: {q.text} ({q.totalMarks} marks)</p>
                            <div className="mt-2 text-sm text-white">
                                <p className="font-semibold">Student's Answer:</p>
                                <p className="whitespace-pre-wrap p-2 bg-gray-900/50 rounded mt-1">{userAnswer}</p>
                            </div>
                            
                            {(q.type === QuestionType.Essay) && (
                                <div className="mt-2 text-sm">
                                    <p className="font-semibold text-gray-400">Model Answer/Guidelines:</p>
                                    <p className="whitespace-pre-wrap p-2 bg-gray-900/50 rounded mt-1 text-gray-300">{q.correctAnswer}</p>
                                </div>
                            )}
                             {q.explanation && (
                                <div className="mt-2 text-sm">
                                    <p className="font-semibold text-gray-400">Explanation:</p>
                                    <p className="whitespace-pre-wrap p-2 bg-gray-900/50 rounded mt-1 text-gray-300">{q.explanation}</p>
                                </div>
                            )}

                            {q.type !== QuestionType.Essay && (
                                 <p className="text-sm mt-2">Correct Answer: <span className="font-mono text-gray-300">{q.correctAnswer}</span></p>
                            )}
                            
                            {q.type === QuestionType.Essay && (
                                <div className="mt-3">
                                    <label className="text-sm font-semibold">Score:</label>
                                    <input
                                        type="number"
                                        max={q.totalMarks}
                                        min={0}
                                        value={submission.essayScores?.[q.id] || ''}
                                        onChange={e => handleEssayScoreChange(q.id, parseInt(e.target.value))}
                                        className="w-24 bg-gray-600 p-1 rounded ml-2"
                                    /> / {q.totalMarks}
                                </div>
                            )}

                            <div className="mt-4">
                                <label className="text-sm font-semibold text-accent">Feedback for this question (optional):</label>
                                <div className="relative mt-1">
                                    <textarea
                                        value={submission.questionFeedback?.[q.id] || ''}
                                        onChange={e => handleQuestionFeedbackChange(q.id, e.target.value)}
                                        rows={3}
                                        className="w-full bg-gray-600 p-2 rounded pr-12"
                                        placeholder="Provide specific feedback..."
                                    />
                                    <button 
                                        onClick={() => generateFeedback('question', q.id)} 
                                        disabled={aiLoading[q.id]}
                                        className="absolute right-2 bottom-2 p-1.5 bg-primary text-white rounded-full hover:bg-blue-700 disabled:bg-gray-500"
                                        title="Generate feedback with AI"
                                    >
                                        {aiLoading[q.id] ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <Wand2Icon className="w-4 h-4"/>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

             <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-lg font-bold text-accent mb-4">Overall Feedback</h3>
                <div className="relative mb-4">
                    <textarea
                        value={submission.feedback || ''}
                        onChange={e => handleOverallFeedbackChange(e.target.value)}
                        rows={4}
                        className="w-full bg-gray-600 p-2 rounded pr-12"
                        placeholder="Provide overall feedback for the student's submission..."
                    />
                    <button 
                        onClick={() => generateFeedback('overall')}
                        disabled={aiLoading['overall']}
                        className="absolute right-2 bottom-2 p-1.5 bg-primary text-white rounded-full hover:bg-blue-700 disabled:bg-gray-500"
                        title="Generate overall feedback with AI"
                    >
                         {aiLoading['overall'] ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div> : <Wand2Icon className="w-4 h-4"/>}
                    </button>
                </div>
                <div>
                    <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-semibold text-sm ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'}`}
                    >
                        <MicIcon className="w-4 h-4" />
                        <span>{isRecording ? 'Stop Recording' : 'Record Audio Feedback'}</span>
                    </button>
                    {audioUrl && <audio src={audioUrl} controls className="mt-2 w-full max-w-sm"/>}
                </div>
            </div>

            <div className="mt-8 flex justify-end">
                <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-500">Save Grade & Mark as Complete</button>
            </div>
        </div>
    );
};


(SubmissionsTab as React.FC<any>) = ({ quizzes, submissions, setSubmissions, classStudents }) => {
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);

    const subsForSelectedQuiz = useMemo(() => {
        if (!selectedQuizId) return [];
        return submissions.filter((s: Submission) => s.quizId === selectedQuizId);
    }, [submissions, selectedQuizId]);
    
    const handleSaveGrade = (submission: Submission) => {
        setSubmissions((prev: Submission[]) => prev.map(s => s.id === submission.id ? submission : s));
        setViewingSubmission(null);
    };

    if (viewingSubmission) {
        const quiz = quizzes.find((q: Quiz) => q.id === viewingSubmission.quizId);
        const student = classStudents.find((s: Student) => s.id === viewingSubmission.studentId);
        if(!quiz || !student) return <p>Error loading submission data.</p>;
        
        return <SubmissionGrader submission={viewingSubmission} quiz={quiz} student={student} onSave={handleSaveGrade} onBack={() => setViewingSubmission(null)} />;
    }

    return (
        <div>
            <h2 className="text-xl font-bold text-white mb-6">Submissions</h2>
            <div className="mb-4">
                <label className="text-sm text-gray-400">Select a quiz to view submissions:</label>
                <select onChange={e => setSelectedQuizId(e.target.value)} value={selectedQuizId || ''} className="w-full bg-gray-700 p-2 rounded mt-1">
                    <option value="">-- Select Quiz --</option>
                    {quizzes.map((q: Quiz) => <option key={q.id} value={q.id}>{q.title}</option>)}
                </select>
            </div>
            
            {selectedQuizId && (
                <div className="space-y-3">
                    {subsForSelectedQuiz.map((sub: Submission) => {
                        const student = classStudents.find((s: Student) => s.id === sub.studentId);
                        return (
                            <div key={sub.id} className="p-4 bg-gray-700 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white">{student?.fullName || 'Unknown Student'}</p>
                                    <p className="text-sm text-gray-400">Submitted: {new Date(sub.submittedAt).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${sub.isMarked ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>
                                        {sub.isMarked ? 'Graded' : 'Pending'}
                                    </span>
                                    <button onClick={() => setViewingSubmission(sub)} className="bg-primary text-white px-3 py-1 rounded hover:bg-blue-800">
                                        {sub.isMarked ? 'View/Edit Grade' : 'Grade Now'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {subsForSelectedQuiz.length === 0 && <p className="text-center text-gray-500 py-4">No submissions for this quiz yet.</p>}
                </div>
            )}
        </div>
    );
};

(EnquiriesTab as React.FC<any>) = ({ enquiries, setEnquiries, teacher }) => {
    const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);

    const handleSendMessage = (enquiryId: string, message: EnquiryMessage) => {
        setEnquiries((prev: Enquiry[]) => prev.map(e => e.id === enquiryId ? { ...e, messages: [...e.messages, message] } : e));
    };
    
    const handleResolve = (enquiryId: string) => {
        setEnquiries((prev: Enquiry[]) => prev.map(e => e.id === enquiryId ? { ...e, isResolved: true } : e));
    };

    const selectedEnquiry = useMemo(() => enquiries.find((e: Enquiry) => e.id === selectedEnquiryId), [enquiries, selectedEnquiryId]);

    return (
        <div className="grid grid-cols-3 gap-4 h-[75vh]">
            <div className="col-span-1 bg-gray-700/50 rounded-lg overflow-y-auto">
                <h3 className="p-3 font-semibold border-b border-gray-600">Enquiries</h3>
                <ul>
                    {enquiries.map((enq: Enquiry) => (
                        <li key={enq.id}>
                            <button onClick={() => setSelectedEnquiryId(enq.id)} className={`w-full text-left p-3 hover:bg-gray-700 ${selectedEnquiryId === enq.id ? 'bg-gray-700' : ''}`}>
                                <p className="font-semibold">{enq.studentName}</p>
                                <p className="text-xs text-gray-400 truncate">{enq.messages[enq.messages.length - 1]?.text}</p>
                                {!enq.isResolved && <span className="text-xs text-red-400">Needs Reply</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="col-span-2 bg-gray-700/50 rounded-lg flex flex-col">
                {selectedEnquiry ? <EnquiryChat enquiry={selectedEnquiry} teacher={teacher} onSendMessage={handleSendMessage} onResolve={handleResolve}/> : <div className="flex items-center justify-center h-full"><p className="text-gray-500">Select an enquiry to view.</p></div>}
            </div>
        </div>
    );
};

const EnquiryChat: React.FC<{
    enquiry: Enquiry;
    teacher: Teacher;
    onSendMessage: (enquiryId: string, message: EnquiryMessage) => void;
    onResolve: (enquiryId: string) => void;
}> = ({ enquiry, teacher, onSendMessage, onResolve }) => {
    const [text, setText] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    
    const handleSend = async () => {
        if(!text.trim() && !imageUrl && !audioUrl) return;
        setIsSending(true);
        try {
            const newMessage: EnquiryMessage = {
                id: `msg-${Date.now()}`,
                authorId: teacher.id,
                authorName: teacher.fullName,
                text: text.trim() || undefined,
                imageUrl: imageUrl || undefined,
                audioUrl: audioUrl || undefined,
                timestamp: Date.now(),
            };
            onSendMessage(enquiry.id, newMessage);
            setText('');
            setImageUrl(null);
            setAudioUrl(null);
        } finally {
            setIsSending(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result as string);
                setImageUrl(compressed);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Your browser does not support audio recording.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                const reader = new FileReader();
                reader.onloadend = () => setAudioUrl(reader.result as string);
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting audio recording:", err);
            alert("Could not start recording. Please check microphone permissions.");
        }
    };
    
    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-gray-600 flex justify-between items-center">
                <h4 className="font-semibold">{enquiry.studentName}</h4>
                {!enquiry.isResolved && <button onClick={() => onResolve(enquiry.id)} className="text-sm bg-green-600 text-white px-2 py-1 rounded">Mark as Resolved</button>}
                {enquiry.isResolved && <span className="text-sm text-green-400">Resolved</span>}
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {enquiry.messages.map(msg => (
                     <div key={msg.id} className={`flex ${msg.authorId === teacher.id ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.authorId === teacher.id ? 'bg-accent text-gray-900' : 'bg-gray-600 text-gray-200'}`}>
                            <p className="font-bold text-sm">{msg.authorName}</p>
                            {msg.text && <p className="text-sm mt-1 whitespace-pre-wrap">{msg.text}</p>}
                            {msg.imageUrl && <img src={msg.imageUrl} alt="attachment" className="mt-2 rounded-lg max-w-full h-auto border border-white/10"/>}
                            {msg.audioUrl && <audio src={msg.audioUrl} controls className="mt-2 w-full h-10"/>}
                            <p className="text-xs mt-2 opacity-70 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                         </div>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-gray-600">
                {imageUrl && (
                    <div className="mb-2 relative w-24">
                        <img src={imageUrl} alt="preview" className="rounded h-24 w-24 object-cover border border-accent"/>
                        <button onClick={() => setImageUrl(null)} className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 text-white shadow-md">
                            <XCircleIcon className="w-5 h-5"/>
                        </button>
                    </div>
                )}
                {audioUrl && (
                    <div className="mb-2 flex items-center space-x-2 bg-gray-700/50 p-1 rounded-lg border border-accent/30">
                        <audio src={audioUrl} controls className="h-8 flex-grow"/>
                        <button onClick={() => setAudioUrl(null)} className="p-1 text-red-500 hover:text-red-400"><Trash2Icon className="w-4 h-4"/></button>
                    </div>
                )}
                <div className="flex space-x-2">
                    <input 
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Type your reply..."
                        disabled={isSending}
                        className="flex-grow bg-gray-600 p-2 rounded text-white"
                        onKeyDown={e => e.key === 'Enter' && !isSending && handleSend()}
                    />
                    <label className="cursor-pointer p-2 text-gray-400 hover:text-blue-400 my-auto" title="Attach Image">
                        <PaperclipIcon className="w-5 h-5" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    <button onClick={isRecording ? stopRecording : startRecording} disabled={isSending} className={`p-2 my-auto text-white rounded-full transition-colors ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500 hover:bg-gray-400'}`}>
                        {isRecording ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5"/>}
                    </button>
                    <button onClick={handleSend} disabled={isSending || (!text.trim() && !imageUrl && !audioUrl)} className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-800 disabled:opacity-50 transition-all flex items-center justify-center min-w-[60px]">
                        {isSending ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <SendIcon className="w-5 h-5"/>}
                    </button>
                </div>
            </div>
        </div>
    );
}

const TeacherLiveLessonView: React.FC<{
    lesson: Lesson;
    onEndLesson: (lessonId: string) => void;
    classStudents: Student[];
    teacher: Teacher;
    setLessons: (value: Lesson[] | ((val: Lesson[]) => Lesson[])) => void;
}> = ({ lesson, onEndLesson, classStudents, teacher, setLessons }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const [isBreakoutModalOpen, setIsBreakoutModalOpen] = useState(false);

    const [isAnnotating, setIsAnnotating] = useState(false);
    const [annotationColor, setAnnotationColor] = useState('#FF0000');
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPos = useRef({x: 0, y: 0});
    
    const [isWhiteboardMode, setIsWhiteboardMode] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Live lessons require a modern browser with media access.");
            return;
        }

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                if (isMounted) {
                    streamRef.current = stream;
                    if (videoRef.current && !isScreenSharing) {
                        videoRef.current.srcObject = stream;
                    }
                }
            })
            .catch(err => {
              console.error("Error accessing media devices.", err);
              if (err.name === 'NotAllowedError') {
                alert("Please enable camera and microphone access to start the live lesson.");
              } else {
                alert("Failed to access camera/microphone. Ensure no other app is using them.");
              }
            });

        return () => {
            isMounted = false;
            streamRef.current?.getTracks().forEach(track => track.stop());
            screenStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, []);

    const handleEndBreakoutSession = useCallback(() => {
        if (!lesson.breakoutSession) return;
        setLessons(prev => prev.map(l => 
            l.id === lesson.id 
            ? { ...l, breakoutSession: { ...l.breakoutSession!, isActive: false } } 
            : l
        ));
    }, [lesson.id, lesson.breakoutSession, setLessons]);

    useEffect(() => {
        if (lesson.breakoutSession?.isActive && lesson.breakoutSession.endTime) {
            const now = Date.now();
            if (now >= lesson.breakoutSession.endTime) {
                handleEndBreakoutSession();
                return;
            }
            const timeoutId = setTimeout(handleEndBreakoutSession, lesson.breakoutSession.endTime - now);
            return () => clearTimeout(timeoutId);
        }
    }, [lesson.breakoutSession, handleEndBreakoutSession]);

    useEffect(() => {
        if (isWhiteboardMode) {
            setIsAnnotating(true);
            setAnnotationColor('#000000');
        } else {
             setAnnotationColor('#FF0000');
        }
    }, [isWhiteboardMode]);

    const toggleGlobalControl = (field: keyof Lesson, value: boolean) => {
        setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, [field]: value } : l));
    };

    const handleSaveRecording = (blob: Blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const newRecording: Recording = {
            id: `rec-${Date.now()}`,
            lessonId: lesson.id,
            recordedById: teacher.id,
            recordedByName: teacher.fullName,
            url: objectUrl,
            timestamp: Date.now(),
        };
        setLessons(prevLessons => 
            prevLessons.map(l => 
                l.id === lesson.id 
                ? { ...l, recordings: [...(l.recordings || []), newRecording] } 
                : l
            )
        );
    };

    const handleStartRecording = () => {
        const streamToRecord = isScreenSharing ? screenStreamRef.current : streamRef.current;
        if (!streamToRecord) return;
        try {
            recordedChunksRef.current = [];
            const mimeType = MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4';
            mediaRecorderRef.current = new MediaRecorder(streamToRecord, { mimeType });
            mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) recordedChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: mimeType });
                handleSaveRecording(blob);
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Recording Error:", e);
            alert("Could not start recording.");
        }
    };
    
    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    const handleToggleScreenShare = async () => {
        if (isScreenSharing) {
            screenStreamRef.current?.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
            if (videoRef.current && streamRef.current) {
                videoRef.current.srcObject = streamRef.current;
            }
            setIsScreenSharing(false);
            setIsAnnotating(false);
            setIsWhiteboardMode(false);
            setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, screenSharerId: undefined } : l));
        } else {
            try {
                if (!navigator.mediaDevices.getDisplayMedia) {
                  alert("Screen sharing is not supported on your browser.");
                  return;
                }
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                screenStreamRef.current = screenStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = screenStream;
                }
                setIsScreenSharing(true);
                setIsWhiteboardMode(false);
                setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, screenSharerId: teacher.id } : l));

                screenStream.getVideoTracks()[0].onended = () => {
                    if (videoRef.current && streamRef.current) {
                        videoRef.current.srcObject = streamRef.current;
                    }
                    setIsScreenSharing(false);
                    setIsAnnotating(false);
                    setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, screenSharerId: undefined } : l));
                };
            } catch (err) {
                console.error("Error starting screen share:", err);
            }
        }
    };
    
    const getMousePos = (canvas: HTMLCanvasElement, evt: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: evt.clientX - rect.left,
          y: evt.clientY - rect.top
        };
    }
    
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isAnnotating) return;
        const pos = getMousePos(e.currentTarget, e.nativeEvent);
        lastPos.current = pos;
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !isAnnotating) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;
        
        const pos = getMousePos(e.currentTarget, e.nativeEvent);
        ctx.beginPath();
        ctx.strokeStyle = annotationColor;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };
    
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        if(!parent) return;

        const resizeObserver = new ResizeObserver(() => {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        });
        resizeObserver.observe(parent);
        return () => resizeObserver.disconnect();
    }, [isScreenSharing, isWhiteboardMode]);

    return (
        <div className="fixed inset-0 bg-gray-900 z-50 p-4 flex flex-col text-white">
             {isBreakoutModalOpen && (
                <BreakoutSessionSetupModal
                    lesson={lesson}
                    classStudents={classStudents}
                    onClose={() => setIsBreakoutModalOpen(false)}
                    setLessons={setLessons}
                />
            )}
            <header className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-accent">{lesson.title}</h1>
                    <span className="text-red-400 animate-pulse font-semibold">● LIVE</span>
                </div>
                <button onClick={() => onEndLesson(lesson.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">
                    End Lesson
                </button>
            </header>
            <main className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4 min-h-0">
                <div className="md:col-span-3 bg-gray-800 rounded-lg p-2 overflow-y-auto relative flex flex-col justify-center">
                     {(isAnnotating || isWhiteboardMode) && (
                         <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-gray-700 p-2 rounded-lg flex items-center space-x-2 z-40 shadow-lg border border-gray-600">
                            <button onClick={() => setIsAnnotating(p => !p)} className={`p-2 rounded ${isAnnotating ? 'bg-blue-500' : ''}`} title={isAnnotating ? 'Disable Drawing' : 'Enable Drawing'}><BrushIcon className="w-5 h-5"/></button>
                            {['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FFFFFF', '#000000'].map(c => (
                                <button key={c} onClick={() => setAnnotationColor(c)} style={{ backgroundColor: c }} className={`w-6 h-6 rounded-full border-2 ${annotationColor === c ? 'border-white' : 'border-transparent'}`}></button>
                            ))}
                            <button onClick={clearCanvas} className="p-2 hover:bg-gray-600 rounded" title="Clear Annotations"><Trash2Icon className="w-5 h-5"/></button>
                            <button onClick={() => {setIsAnnotating(false); setIsWhiteboardMode(false);}} className="p-2 ml-2 hover:bg-red-600 rounded" title="Close Annotation Tools"><XIcon className="w-5 h-5"/></button>
                        </div>
                     )}
                     {lesson.breakoutSession?.isActive ? (
                        <BreakoutMonitoringView
                            lesson={lesson}
                            classStudents={classStudents}
                            onEndSession={handleEndBreakoutSession}
                        />
                    ) : (
                        <div className="relative w-full h-full bg-black flex items-center justify-center">
                            {isWhiteboardMode && <div className="absolute inset-0 bg-white z-20"></div>}

                            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-contain ${!isCameraOn && !isScreenSharing ? 'hidden' : ''} ${isWhiteboardMode ? 'hidden' : ''}`}></video>
                            
                            {!isCameraOn && !isScreenSharing && !isWhiteboardMode && <div className="w-full h-full flex items-center justify-center bg-gray-900"><UserCircleIcon className="w-1/4 h-1/4 text-gray-600"/></div>}
                            
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                className={`absolute top-0 left-0 w-full h-full z-30 ${isAnnotating ? 'cursor-crosshair' : 'cursor-default pointer-events-none'}`}
                            />
                        </div>
                    )}
                </div>
                <div className="bg-gray-800 rounded-lg p-4 flex flex-col space-y-4 overflow-y-auto">
                    <div>
                        <h2 className="text-lg font-semibold text-accent mb-2">My Controls</h2>
                        <div className="flex justify-center items-center space-x-3 py-2">
                            <button onClick={() => setIsMicOn(!isMicOn)} className={`p-3 rounded-full ${isMicOn ? 'bg-gray-600' : 'bg-red-600'} text-white`}>{isMicOn ? <MicIcon className="w-6 h-6" /> : <MicOffIcon className="w-6 h-6"/>}</button>
                            <button onClick={() => setIsCameraOn(!isCameraOn)} className={`p-3 rounded-full ${isCameraOn ? 'bg-gray-600' : 'bg-red-600'} text-white`}>{isCameraOn ? <VideoIcon className="w-6 h-6"/> : <VideoOffIcon className="w-6 h-6"/>}</button>
                            <button onClick={handleToggleScreenShare} className={`p-3 rounded-full ${isScreenSharing ? 'bg-blue-500' : 'bg-gray-600'} text-white`}>{isScreenSharing ? <ScreenShareOffIcon className="w-6 h-6"/> : <ScreenShareIcon className="w-6 h-6"/>}</button>
                            <button onClick={isRecording ? handleStopRecording : handleStartRecording} className={`p-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-600'} text-white`}>
                                <RecordIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                     <div className="border-t border-gray-700 pt-4">
                        <h2 className="text-lg font-semibold text-accent mb-2">Session Tools</h2>
                         <button onClick={() => setIsWhiteboardMode(!isWhiteboardMode)} disabled={isScreenSharing} className={`w-full flex items-center justify-center space-x-2 mb-2 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 ${isWhiteboardMode ? 'bg-accent text-gray-900' : 'bg-gray-600 hover:bg-gray-500'}`}>
                            <FileWordIcon className="w-5 h-5"/>
                            <span>{isWhiteboardMode ? 'Close Whiteboard' : 'Whiteboard'}</span>
                        </button>
                        <button onClick={() => setIsAnnotating(!isAnnotating)} className={`w-full flex items-center justify-center space-x-2 mb-2 text-white font-bold py-2 px-4 rounded-lg ${isAnnotating ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}>
                            <BrushIcon className="w-5 h-5"/>
                            <span>{isAnnotating ? 'Stop Annotating' : 'Annotate Screen'}</span>
                        </button>
                        <button onClick={() => setIsBreakoutModalOpen(true)} disabled={!!lesson.breakoutSession?.isActive} className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            <GitMergeIcon className="w-5 h-5"/>
                            <span>Breakout Rooms</span>
                        </button>
                     </div>
                    <div className="border-t border-gray-700 pt-4">
                        <h2 className="text-lg font-semibold text-accent mb-2">Global Controls</h2>
                        <div className="space-y-3">
                            <label className="flex items-center text-sm cursor-pointer"><input type="checkbox" checked={!!lesson.lockStudentAudio} onChange={e => toggleGlobalControl('lockStudentAudio', e.target.checked)} className="mr-2" /> Mute All Students' Mics</label>
                            <label className="flex items-center text-sm cursor-pointer"><input type="checkbox" checked={!!lesson.lockStudentVideo} onChange={e => toggleGlobalControl('lockStudentVideo', e.target.checked)} className="mr-2" /> Turn Off All Students' Videos</label>
                            <label className="flex items-center text-sm cursor-pointer"><input type="checkbox" checked={!!lesson.allowStudentRecording} onChange={e => toggleGlobalControl('allowStudentRecording', e.target.checked)} className="mr-2" /> Allow Students to Record</label>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const BreakoutSessionSetupModal: React.FC<{
    lesson: Lesson;
    classStudents: Student[];
    onClose: () => void;
    setLessons: (value: Lesson[] | ((val: Lesson[]) => Lesson[])) => void;
}> = ({ lesson, classStudents, onClose, setLessons }) => {
    const [step, setStep] = useState(1);
    const [duration, setDuration] = useState(10); 
    const [numGroups, setNumGroups] = useState(Math.min(classStudents.length || 2, 2));
    const [leaderOption, setLeaderOption] = useState<'none' | 'teacher_assigns' | 'student_chooses'>('none');
    const [groups, setGroups] = useState<BreakoutGroup[]>([]);

    const handleCreateGroups = () => {
        const shuffledStudents = [...classStudents].sort(() => 0.5 - Math.random());
        const newGroups: BreakoutGroup[] = Array.from({ length: numGroups }, (_, i) => ({
            id: `group-${Date.now()}-${i}`,
            name: `Group ${i + 1}`,
            studentIds: [],
            leaderIds: []
        }));

        shuffledStudents.forEach((student, index) => {
            newGroups[index % numGroups].studentIds.push(student.id);
        });

        setGroups(newGroups);
        setStep(2);
    };

    const handleSetLeader = (groupId: string, studentId: string, isLeader: boolean) => {
        setGroups(prevGroups => prevGroups.map(g => {
            if (g.id === groupId) {
                const newLeaderIds = isLeader
                    ? [...g.leaderIds, studentId]
                    : g.leaderIds.filter(id => id !== studentId);
                return { ...g, leaderIds: newLeaderIds };
            }
            return g;
        }));
    };

    const handleStartSession = () => {
        const endTime = Date.now() + duration * 60 * 1000;
        const newBreakoutSession: BreakoutSession = {
            isActive: true,
            endTime,
            groups,
        };
        setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, breakoutSession: newBreakoutSession } : l));
        onClose();
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-3xl h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-white">Setup Breakout Rooms</h2>
                {step === 1 && (
                    <div className="space-y-6">
                         <div>
                            <label className="block text-sm font-medium text-gray-400">Number of Groups</label>
                            <input type="range" min="2" max={classStudents.length} value={numGroups} onChange={e => setNumGroups(parseInt(e.target.value))} className="w-full mt-1" />
                            <p className="text-center font-semibold">{numGroups} groups</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400">Duration (minutes)</label>
                            <input type="number" min="1" value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="mt-1 w-full bg-gray-700 p-2 rounded" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-400 mb-2">Group Leaders</label>
                             <div className="space-y-2">
                                <label className="flex items-center"><input type="radio" name="leader" value="none" checked={leaderOption === 'none'} onChange={() => setLeaderOption('none')} className="mr-2"/> No Leaders</label>
                                <label className="flex items-center"><input type="radio" name="leader" value="teacher_assigns" checked={leaderOption === 'teacher_assigns'} onChange={() => setLeaderOption('teacher_assigns')} className="mr-2"/> Teacher Assigns Leaders</label>
                                <label className="flex items-center"><input type="radio" name="leader" value="student_chooses" checked={leaderOption === 'student_chooses'} onChange={() => setLeaderOption('student_chooses')} className="mr-2"/> Students Choose Leaders</label>
                             </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex-grow overflow-y-auto pr-2">
                        <h3 className="text-lg font-semibold text-accent mb-4">Assign Students & Leaders</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groups.map((group) => (
                                <div key={group.id} className="bg-gray-700 p-3 rounded-lg">
                                    <h4 className="font-bold mb-2">{group.name}</h4>
                                    <ul className="space-y-1">
                                        {group.studentIds.map(studentId => {
                                            const student = classStudents.find(s => s.id === studentId);
                                            return (
                                                <li key={studentId} className="text-sm p-1 rounded bg-gray-600/50">
                                                    {leaderOption === 'teacher_assigns' ? (
                                                        <label className="flex items-center cursor-pointer">
                                                            <input type="checkbox" checked={group.leaderIds.includes(studentId)} onChange={e => handleSetLeader(group.id, studentId, e.target.checked)} className="mr-2"/>
                                                            {student?.fullName}
                                                        </label>
                                                    ) : (
                                                        student?.fullName
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                         {leaderOption === 'student_chooses' && <p className="mt-4 text-sm text-yellow-400">Students will be prompted to choose their own leaders within their groups.</p>}
                    </div>
                )}

                <div className="mt-6 flex justify-between pt-4 border-t border-gray-700">
                    <button type="button" onClick={step === 1 ? onClose : () => setStep(1)} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500">
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>
                    <button type="button" onClick={step === 1 ? handleCreateGroups : handleStartSession} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-800">
                        {step === 1 ? 'Create Groups' : 'Start Breakout Session'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const BreakoutMonitoringView: React.FC<{
    lesson: Lesson;
    classStudents: Student[];
    onEndSession: () => void;
}> = ({ lesson, classStudents, onEndSession }) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!lesson.breakoutSession?.endTime) return;
        const intervalId = setInterval(() => {
            const remaining = Math.max(0, Math.floor((lesson.breakoutSession!.endTime! - Date.now()) / 1000));
            setTimeLeft(remaining);
        }, 1000);
        return () => clearInterval(intervalId);
    }, [lesson.breakoutSession?.endTime]);

    return (
        <div className="w-full h-full flex flex-col p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Breakout Room Monitoring</h2>
                <div className="flex items-center space-x-4">
                    {timeLeft !== null && (
                        <span className="font-mono text-xl bg-gray-700 text-white px-4 py-2 rounded-lg">
                            {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                    )}
                    <button onClick={onEndSession} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">
                        End Session for All
                    </button>
                </div>
            </div>
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                {lesson.breakoutSession?.groups.map(group => (
                    <div key={group.id} className="bg-gray-700 rounded-lg p-3 flex flex-col">
                        <h3 className="text-lg font-bold text-accent">{group.name}</h3>
                        <ul className="flex-grow mt-2 space-y-1 text-sm">
                            {group.studentIds.map(studentId => {
                                const student = classStudents.find(s => s.id === studentId);
                                const isLeader = group.leaderIds.includes(studentId);
                                return (
                                    <li key={studentId} className="flex items-center">
                                        <UserCircleIcon className="w-4 h-4 mr-2" />
                                        <span>{student?.fullName}</span>
                                        {isLeader && <span className="ml-2 text-xs bg-yellow-500 text-black font-bold px-2 py-0.5 rounded-full">Leader</span>}
                                    </li>
                                );
                            })}
                        </ul>
                         <button className="mt-3 w-full text-sm bg-blue-600 hover:bg-blue-500 text-white py-1 rounded-md">Join Room</button>
                    </div>
                ))}
            </div>
        </div>
    );
};


(LessonsNotesTab as React.FC<any>) = ({ lessons, setLessons, notes, setNotes, teacher, classStudents, selectedClass }) => {
    const [modal, setModal] = useState<{ type: 'lesson' | 'note', item?: Lesson | Note } | null>(null);
    const [liveLesson, setLiveLesson] = useState<Lesson | null>(null);

    const openModal = (type: 'lesson' | 'note', item?: Lesson | Note) => setModal({ type, item });
    
    const handleDelete = (item: Lesson | Note) => {
        const isLesson = 'type' in item && Object.values(LessonType).includes(item.type as LessonType);
        if(window.confirm(`Are you sure you want to delete this ${isLesson ? 'lesson' : 'note'}?`)){
            if(isLesson){
                setLessons((prev: Lesson[]) => prev.filter(l => l.id !== item.id));
            } else {
                setNotes((prev: Note[]) => prev.filter(n => n.id !== item.id));
            }
        }
    };
    
    const handleSave = (item: Lesson | Note) => {
        const isLesson = 'type' in item && Object.values(LessonType).includes(item.type as LessonType);
        if(isLesson){
            setLessons((prev: Lesson[]) => {
                const existing = prev.find(l => l.id === item.id);
                if(existing) return prev.map(l => l.id === item.id ? item as Lesson : l);
                return [...prev, item as Lesson];
            });
        } else {
            setNotes((prev: Note[]) => {
                const existing = prev.find(n => n.id === item.id);
                if(existing) return prev.map(n => n.id === item.id ? item as Note : n);
                return [...prev, item as Note];
            });
        }
        setModal(null);
    };
    
    const handleEndLesson = (lessonId: string) => {
        setLessons((prev: Lesson[]) => prev.map(l => l.id === lessonId ? {...l, endTime: Date.now()} : l));
        setLiveLesson(null);
    };

    if (liveLesson) {
        return <TeacherLiveLessonView lesson={liveLesson} onEndLesson={handleEndLesson} classStudents={classStudents} teacher={teacher} setLessons={setLessons} />;
    }

    return (
        <div>
            {modal && <LessonNoteCreator item={modal.item} type={modal.type} classId={selectedClass.id} onSave={handleSave} onCancel={() => setModal(null)} />}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Lessons & Notes</h2>
                <div className="flex space-x-2">
                    <button onClick={() => openModal('lesson')} className="flex items-center space-x-2 bg-primary text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-800">
                        <PlusCircleIcon className="w-5 h-5"/>
                        <span>New Lesson</span>
                    </button>
                    <button onClick={() => openModal('note')} className="flex items-center space-x-2 bg-secondary text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-600">
                        <PlusCircleIcon className="w-5 h-5"/>
                        <span>New Note</span>
                    </button>
                </div>
            </div>
            <div className="space-y-4">
                {[...lessons, ...notes].sort((a,b) => (((b as Lesson).scheduledTime || 0) - ((a as Lesson).scheduledTime || 0))).map(item => {
                    const isLesson = 'type' in item && Object.values(LessonType).includes(item.type as LessonType);
                    const lesson = isLesson ? item as Lesson : null;
                    const note = !isLesson ? item as Note : null;
                    return (
                        <div key={item.id} className="p-4 bg-gray-700 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-bold text-white">{item.title}</p>
                                <p className="text-xs text-gray-400 uppercase font-semibold">{(item as Lesson).type || (item as Note).type}</p>
                                {item.requireAccessCode && <p className="text-sm font-mono bg-gray-600 inline-block px-2 py-0.5 rounded mt-1 text-accent">{item.code}</p>}
                                {lesson?.type === LessonType.Live && lesson.scheduledTime && !lesson.endTime && <p className="text-xs mt-1 text-yellow-400">Scheduled: {new Date(lesson.scheduledTime).toLocaleString()}</p>}
                                {lesson?.endTime && <p className="text-xs mt-1 text-red-400">Lesson Ended</p>}
                            </div>
                            <div className="flex items-center space-x-2">
                                {lesson?.type === LessonType.Live && !lesson.endTime && <button onClick={() => setLiveLesson(lesson)} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-500">Start Lesson</button>}
                                <button onClick={() => openModal(isLesson ? 'lesson' : 'note', item)} className="p-1 text-gray-400 hover:text-blue-400"><EditIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(item)} className="p-1 text-gray-400 hover:text-red-400"><Trash2Icon className="w-5 h-5"/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
const ReportGeneratorModal: React.FC<{
    students: Student[];
    quizzes: Quiz[];
    submissions: Submission[];
    onClose: () => void;
}> = ({ students, quizzes, submissions, onClose }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [gradeSystem, setGradeSystem] = useState<string>("Undergraduate/Tertiary");
    const [gradeRanges, setGradeRanges] = useLocalStorage<GradeRange[]>(`grades-${gradeSystem}`, 
        gradingSystemsData[gradeSystem].map((g, i) => ({...g, id: `grade-${i}`}))
    );

    const reportData: ReportData[] = useMemo(() => {
        return students.map(student => {
            const studentSubs = submissions.filter(s => s.studentId === student.id && s.isMarked);
            let totalScore = 0;
            let totalPossibleScore = 0;
            
            studentSubs.forEach(sub => {
                const quiz = quizzes.find(q => q.id === sub.quizId);
                if (quiz) {
                    totalScore += sub.totalMarks || 0;
                    totalPossibleScore += quiz.questions.reduce((acc, q) => acc + (q.totalMarks || 0), 0);
                }
            });

            const percentage = totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;
            
            const gradeRange = gradeRanges.find(r => percentage >= r.min && percentage <= r.max);

            return {
                studentId: student.id,
                studentName: student.fullName,
                totalScore,
                totalPossibleScore,
                percentage,
                grade: gradeRange?.grade,
                remark: gradeRange?.remark,
            };
        });
    }, [students, submissions, quizzes, gradeRanges]);

    const handleGeneratePdf = async () => {
        if (!reportRef.current) return;
        setIsGenerating(true);
        const canvas = await html2canvas(reportRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        pdf.save('student-reports.pdf');
        setIsGenerating(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-white">Generate Student Report</h2>
                <div ref={reportRef} className="bg-white text-black p-8 flex-grow overflow-y-auto">
                    <h1 className="text-2xl font-bold text-center mb-4">Student Performance Report</h1>
                    <table className="w-full border-collapse border border-gray-400">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-gray-400 p-2">Student Name</th>
                                <th className="border border-gray-400 p-2">Total Score</th>
                                <th className="border border-gray-400 p-2">Percentage</th>
                                <th className="border border-gray-400 p-2">Grade</th>
                                <th className="border border-gray-400 p-2">Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map(data => (
                                <tr key={data.studentId}>
                                    <td className="border border-gray-400 p-2">{data.studentName}</td>
                                    <td className="border border-gray-400 p-2 text-center">{data.totalScore} / {data.totalPossibleScore}</td>
                                    <td className="border border-gray-400 p-2 text-center">{data.percentage.toFixed(1)}%</td>
                                    <td className="border border-gray-400 p-2 text-center">{data.grade || 'N/A'}</td>
                                    <td className="border border-gray-400 p-2">{data.remark || 'N/A'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                    <button onClick={handleGeneratePdf} disabled={isGenerating} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-800 disabled:opacity-50">
                        {isGenerating ? 'Generating PDF...' : 'Download as PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
};

(ProgressTrackerTab as React.FC<{
    classStudents: Student[];
    quizzes: Quiz[];
    submissions: Submission[];
    viewingStudentId: string | null;
    setViewingStudentId: React.Dispatch<React.SetStateAction<string | null>>;
}>) = ({ classStudents, quizzes, submissions, viewingStudentId, setViewingStudentId }) => {
    const [viewMode, setViewMode] = useState<'student' | 'quiz'>('student');
    const [selectedStudentIds, setSelectedStudentIds] = useState<Record<string, boolean>>({});
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [showReportGenerator, setShowReportGenerator] = useState(false);

    useEffect(() => {
        if (viewingStudentId) {
            setViewMode('student');
            setSelectedStudentIds({ [viewingStudentId]: true });
        } else {
            setSelectedStudentIds({});
        }
    }, [viewingStudentId]);

    const studentPerformance = useMemo(() => {
        const studentIds = Object.keys(selectedStudentIds).filter(id => selectedStudentIds[id]);
        if (studentIds.length === 0) return [];

        return studentIds.map(studentId => {
            const studentSubs = submissions.filter((s: Submission) => s.studentId === studentId && s.isMarked);
            const percentages = studentSubs.map((sub: Submission) => {
                const quiz = quizzes.find((q: Quiz) => q.id === sub.quizId);
                const totalPossible = quiz?.questions.reduce((acc: number, q: Question) => acc + (q.totalMarks || 0), 0) || 0;
                return totalPossible > 0 ? ((sub.totalMarks || 0) / totalPossible) * 100 : 0;
            });

            if (percentages.length === 0) return { studentId, name: classStudents.find((s: Student) => s.id === studentId)?.fullName, highest: null, lowest: null, average: null };
            
            return {
                studentId,
                name: classStudents.find((s: Student) => s.id === studentId)?.fullName,
                highest: Math.max(...percentages),
                lowest: Math.min(...percentages),
                average: percentages.reduce((a: number, b: number) => a + b, 0) / percentages.length,
            };
        });
    }, [selectedStudentIds, submissions, quizzes, classStudents]);
    
    const quizPerformance = useMemo(() => {
        if (!selectedQuizId) return null;
        const quiz = quizzes.find((q: Quiz) => q.id === selectedQuizId);
        const quizSubs = submissions.filter((s: Submission) => s.quizId === selectedQuizId && s.isMarked);
        if (!quiz || quizSubs.length === 0) return null;

        const totalPossible = quiz.questions.reduce((acc: number, q: Question) => acc + (q.totalMarks || 0), 0);
        if (totalPossible === 0) return null;
        
        let highest = { score: -1, studentName: '' };
        let lowest = { score: Infinity, studentName: '' };
        let totalScore = 0;

        quizSubs.forEach((sub: Submission) => {
            const score = sub.totalMarks || 0;
            const studentName = classStudents.find((s: Student) => s.id === sub.studentId)?.fullName || 'Unknown';
            if (score > highest.score) highest = { score, studentName };
            if (score < lowest.score) lowest = { score, studentName };
            totalScore += score;
        });
        
        return {
            highest,
            lowest,
            average: totalScore / quizSubs.length,
            totalPossible,
        };
    }, [selectedQuizId, submissions, quizzes, classStudents]);
    
    const numSelectedStudents = Object.values(selectedStudentIds).filter(Boolean).length;
    const selectedStudentsForReport = useMemo(() => classStudents.filter((s: Student) => selectedStudentIds[s.id]), [classStudents, selectedStudentIds]);
    
    const handleViewAll = () => {
        setViewingStudentId(null);
    };

    return (
        <div>
            {showReportGenerator && <ReportGeneratorModal students={selectedStudentsForReport} quizzes={quizzes} submissions={submissions} onClose={() => setShowReportGenerator(false)} />}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Progress Tracker</h2>
                {viewingStudentId && (
                     <button onClick={handleViewAll} className="text-sm text-blue-400 hover:underline flex items-center">
                        <ChevronLeftIcon className="w-4 h-4 mr-1"/> Back to All Students
                    </button>
                )}
            </div>
            
            {!viewingStudentId && (
                <div className="flex border-b border-gray-700 mb-4">
                    <button onClick={() => setViewMode('student')} className={`py-2 px-4 text-sm font-medium ${viewMode === 'student' ? 'border-b-2 border-accent text-accent' : 'text-gray-400'}`}>By Student</button>
                    <button onClick={() => setViewMode('quiz')} className={`py-2 px-4 text-sm font-medium ${viewMode === 'quiz' ? 'border-b-2 border-accent text-accent' : 'text-gray-400'}`}>By Quiz</button>
                </div>
            )}

            {viewMode === 'student' && (
                <div>
                    {!viewingStudentId && (
                        <div className="bg-gray-700/50 p-4 rounded-lg mb-4">
                            <h3 className="font-semibold mb-2">Select Students</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                {classStudents.map((student: Student) => (
                                    <label key={student.id} className="flex items-center text-sm p-1.5 rounded hover:bg-gray-700">
                                        <input type="checkbox" checked={!!selectedStudentIds[student.id]} onChange={e => setSelectedStudentIds((p: Record<string, boolean>) => ({ ...p, [student.id]: e.target.checked }))} className="mr-2" />
                                        {student.fullName}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    {numSelectedStudents > 0 && (
                        <div>
                             <button onClick={() => setShowReportGenerator(true)} className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-800 mb-4">
                                <PrinterIcon className="w-5 h-5"/>
                                <span>Generate Report for {numSelectedStudents} student(s)</span>
                            </button>
                            <div className="space-y-3">
                                {studentPerformance.map(perf => (
                                    <div key={perf.studentId} className="p-3 bg-gray-700 rounded-lg">
                                        <p className="font-bold text-white">{perf.name}</p>
                                        <div className="grid grid-cols-3 gap-2 mt-2 text-center text-sm">
                                            <div><span className="text-xs text-gray-400 block">Highest</span><span className="font-semibold text-green-400">{perf.highest?.toFixed(1) ?? 'N/A'}%</span></div>
                                            <div><span className="text-xs text-gray-400 block">Lowest</span><span className="font-semibold text-red-400">{perf.lowest?.toFixed(1) ?? 'N/A'}%</span></div>
                                            <div><span className="text-xs text-gray-400 block">Average</span><span className="font-semibold text-blue-400">{perf.average?.toFixed(1) ?? 'N/A'}%</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {viewMode === 'quiz' && !viewingStudentId && (
                <div>
                    <select onChange={e => setSelectedQuizId(e.target.value)} value={selectedQuizId || ''} className="w-full bg-gray-700 p-2 rounded mb-4">
                        <option value="">-- Select a Quiz --</option>
                        {quizzes.map((q: Quiz) => <option key={q.id} value={q.id}>{q.title}</option>)}
                    </select>
                    {quizPerformance && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-700 p-4 rounded-lg text-center">
                                <h3 className="text-sm font-semibold text-gray-400">Highest Score</h3>
                                <p className="text-2xl font-bold text-green-400 mt-1">{quizPerformance.highest.score} / {quizPerformance.totalPossible}</p>
                                <p className="text-xs text-gray-300">by {quizPerformance.highest.studentName}</p>
                            </div>
                            <div className="bg-gray-700 p-4 rounded-lg text-center">
                                <h3 className="text-sm font-semibold text-gray-400">Lowest Score</h3>
                                <p className="text-2xl font-bold text-red-400 mt-1">{quizPerformance.lowest.score} / {quizPerformance.totalPossible}</p>
                                <p className="text-xs text-gray-300">by {quizPerformance.lowest.studentName}</p>
                            </div>
                             <div className="bg-gray-700 p-4 rounded-lg text-center">
                                <h3 className="text-sm font-semibold text-gray-400">Average Score</h3>
                                <p className="text-2xl font-bold text-blue-400 mt-1">{quizPerformance.average.toFixed(1)} / {quizPerformance.totalPossible}</p>
                                <p className="text-xs text-gray-300">&nbsp;</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

(RecordingsTab as React.FC<any>) = ({ lessons, teacher, setLessons, classStudents }) => {
    const [viewingRecordingUrl, setViewingRecordingUrl] = useState<string | null>(null);
    const [sharingRecording, setSharingRecording] = useState<Recording | null>(null);
    const [shareWithAll, setShareWithAll] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

    const allRecordings = useMemo(() => {
        return lessons.flatMap((lesson: Lesson) =>
            (lesson.recordings || []).map(rec => ({ ...rec, lessonTitle: lesson.title }))
        ).sort((a: any, b: any) => b.timestamp - a.timestamp);
    }, [lessons]);

    const teacherRecordings = useMemo(() => 
        allRecordings.filter((rec: any) => rec.recordedById === teacher.id), 
        [allRecordings, teacher.id]
    );

    const studentRecordings = useMemo(() => 
        allRecordings.filter((rec: any) => rec.recordedById !== teacher.id),
        [allRecordings, teacher.id]
    );

    const openShareModal = (rec: Recording) => {
        setSharingRecording(rec);
        const currentShares = rec.sharedWithStudentIds || [];
        if (currentShares.includes('all')) {
            setShareWithAll(true);
            setSelectedStudentIds(new Set());
        } else {
            setShareWithAll(false);
            setSelectedStudentIds(new Set(currentShares));
        }
    };

    const handleSaveShare = () => {
        if (!sharingRecording) return;
        const newShares = shareWithAll ? ['all'] : Array.from(selectedStudentIds);
        
        setLessons((prev: Lesson[]) => prev.map(l => {
            if (l.id === sharingRecording.lessonId) {
                return {
                    ...l,
                    recordings: l.recordings?.map(r => r.id === sharingRecording.id ? { ...r, sharedWithStudentIds: newShares } : r)
                };
            }
            return l;
        }));
        setSharingRecording(null);
    };

    const toggleStudentSelection = (studentId: string) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(studentId)) {
            newSet.delete(studentId);
        } else {
            newSet.add(studentId);
        }
        setSelectedStudentIds(newSet);
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-white mb-6">Lesson Recordings</h2>
            
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-accent mb-3">Your Recordings</h3>
                {teacherRecordings.length > 0 ? (
                    <div className="space-y-3">
                        {teacherRecordings.map((rec: any) => (
                            <div key={rec.id} className="p-4 bg-gray-700 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white">{rec.lessonTitle}</p>
                                    <p className="text-sm text-gray-400">Recorded on: {new Date(rec.timestamp).toLocaleString()}</p>
                                    <p className="text-xs text-blue-400 mt-1">
                                        Shared with: {rec.sharedWithStudentIds?.includes('all') ? 'All Students' : `${rec.sharedWithStudentIds?.length || 0} Student(s)`}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button onClick={() => openShareModal(rec)} className="flex items-center space-x-1 text-sm bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded transition-colors">
                                        <UsersIcon className="w-4 h-4"/>
                                        <span>Share</span>
                                    </button>
                                     <a href={rec.url} download={`teacher-recording-${rec.lessonTitle.replace(/\s+/g, '_')}-${rec.timestamp}.webm`} className="text-gray-400 hover:text-white" title="Download">
                                        <ArrowDownToLineIcon className="w-5 h-5"/>
                                    </a>
                                    <button onClick={() => setViewingRecordingUrl(rec.url)} className="bg-primary text-white px-3 py-1 rounded hover:bg-blue-800 text-sm">Play</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">You have not made any recordings.</p>
                )}
            </div>

            <div>
                <h3 className="text-lg font-semibold text-accent mb-3">Student Recordings</h3>
                 {studentRecordings.length > 0 ? (
                    <div className="space-y-3">
                        {studentRecordings.map((rec: any) => (
                            <div key={rec.id} className="p-4 bg-gray-700 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white">{rec.lessonTitle}</p>
                                    <p className="text-sm text-gray-400">Recorded by: {rec.recordedByName}</p>
                                    <p className="text-xs text-gray-500">on: {new Date(rec.timestamp).toLocaleString()}</p>
                                </div>
                                 <div className="flex items-center space-x-3">
                                     <a href={rec.url} download={`student-${rec.recordedByName.replace(/\s+/g, '_')}-recording-${rec.lessonTitle.replace(/\s+/g, '_')}-${rec.timestamp}.webm`} className="text-gray-400 hover:text-white" title="Download">
                                        <ArrowDownToLineIcon className="w-5 h-5"/>
                                    </a>
                                    <button onClick={() => setViewingRecordingUrl(rec.url)} className="bg-primary text-white px-3 py-1 rounded hover:bg-blue-800 text-sm">Play</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No students have made recordings.</p>
                )}
            </div>

            {viewingRecordingUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]" onClick={() => setViewingRecordingUrl(null)}>
                    <div className="bg-gray-800 p-4 rounded-lg shadow-xl w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                        <video src={viewingRecordingUrl} controls autoPlay className="w-full h-auto max-h-[80vh]"></video>
                        <button onClick={() => setViewingRecordingUrl(null)} className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">Close</button>
                    </div>
                </div>
            )}

            {sharingRecording && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
                    <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-md max-h-[80vh] flex flex-col">
                        <h2 className="text-xl font-bold mb-4 text-white">Share Recording</h2>
                        <p className="text-sm text-gray-400 mb-4">Select students to share "{sharingRecording.lessonTitle}" with.</p>
                        
                        <div className="mb-4">
                            <label className="flex items-center p-2 bg-gray-700 rounded cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={shareWithAll} 
                                    onChange={e => setShareWithAll(e.target.checked)} 
                                    className="mr-3 w-5 h-5 text-primary focus:ring-primary border-gray-600 rounded"
                                />
                                <span className="font-semibold text-white">Share with entire class</span>
                            </label>
                        </div>

                        {!shareWithAll && (
                            <div className="flex-grow overflow-y-auto bg-gray-700/50 rounded p-2 space-y-2 border border-gray-600">
                                {classStudents.length > 0 ? classStudents.map((student: Student) => (
                                    <label key={student.id} className="flex items-center p-2 hover:bg-gray-600 rounded cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedStudentIds.has(student.id)} 
                                            onChange={() => toggleStudentSelection(student.id)}
                                            className="mr-3 w-4 h-4 text-primary focus:ring-primary border-gray-600 rounded"
                                        />
                                        <span className="text-gray-200">{student.fullName}</span>
                                    </label>
                                )) : <p className="text-gray-500 text-center py-4">No students in class.</p>}
                            </div>
                        )}

                        <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
                            <button onClick={() => setSharingRecording(null)} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                            <button onClick={handleSaveShare} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-800">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const gradingSystemsData: Record<string, Omit<GradeRange, 'id'>[]> = {
  "Undergraduate/Tertiary": [
    { min: 80, max: 100, grade: 'A', remark: 'Outstanding' },
    { min: 75, max: 79, grade: 'B+', remark: 'Very Good' },
    { min: 70, max: 74, grade: 'B', remark: 'Good' },
    { min: 65, max: 69, grade: 'C+', remark: 'Fairly Good' },
    { min: 60, max: 64, grade: 'C', remark: 'Average' },
    { min: 55, max: 59, grade: 'D+', remark: 'Below Average' },
    { min: 50, max: 54, grade: 'D', remark: 'Marginal Pass' },
    { min: 45, max: 49, grade: 'E', remark: 'Unsatisfactory' },
    { min: 0, max: 44, grade: 'F', remark: 'Fail' },
  ],
  "WASSCE/SHS": [
    { min: 80, max: 100, grade: 'A1', remark: 'Excellent' },
    { min: 70, max: 79, grade: 'B2', remark: 'Very Good' },
    { min: 65, max: 69, grade: 'B3', remark: 'Good' },
    { min: 60, max: 64, grade: 'C4', remark: 'Credit' },
    { min: 55, max: 59, grade: 'C5', remark: 'Credit' },
    { min: 50, max: 54, grade: 'C6', remark: 'Credit' },
    { min: 45, max: 49, grade: 'D7', remark: 'Pass' },
    { min: 40, max: 44, grade: 'E8', remark: 'Pass' },
    { min: 0, max: 39, grade: 'F9', remark: 'Fail' },
  ],
};
