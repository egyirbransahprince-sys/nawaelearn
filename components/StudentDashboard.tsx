
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, Teacher, Quiz, Note, Lesson, Enquiry, Submission, EnquiryMessage, QuestionType, LessonType, Recording, BreakoutGroup, Notification } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { 
    BookOpenIcon, CheckSquareIcon, ClipboardCheckIcon, AwardIcon, HelpCircleIcon, LogOutIcon, 
    Trash2Icon, ClockIcon, MicIcon, VideoIcon, UserCircleIcon, RecordIcon, 
    ScreenShareIcon, ScreenShareOffIcon, PaperclipIcon, XCircleIcon, 
    ArrowDownToLineIcon, BarChart2Icon, UsersIcon, ArchiveIcon, SendIcon, MicOffIcon, EyeIcon, CheckIcon, XIcon
} from './icons';
import NotificationBell from './NotificationBell';
import InstallPWAButton from './InstallPWAButton';

interface StudentDashboardProps {
  student: Student;
  onLogout: () => void;
}

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
            resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% quality JPEG is usually enough and very small
        };
        img.onerror = () => resolve(base64Str);
    });
};

// --- QUIZ TAKER COMPONENT ---

const QuizTaker: React.FC<{
  quiz: Quiz;
  student: Student;
  onComplete: (submission: Submission) => void;
  onCancel: () => void;
}> = ({ quiz, student, onComplete, onCancel }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
    const [view, setView] = useState<'taking' | 'finished'>('taking');
    const [immediateFeedback, setImmediateFeedback] = useState<{ [questionId: string]: boolean | null }>({});
    const [submittedAnswers, setSubmittedAnswers] = useState<{ [questionId: string]: boolean }>({});
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isConfirmingSubmit, setIsConfirmingSubmit] = useState(false);
    const [showEssayConfirm, setShowEssayConfirm] = useState(false);

    const questions = useMemo(() => {
        if (quiz.reshuffleQuestions) {
            return [...quiz.questions].sort(() => Math.random() - 0.5);
        }
        return quiz.questions;
    }, [quiz.questions, quiz.reshuffleQuestions]);

    const isLastQuestion = currentQuestionIndex === questions.length - 1;

    const handleQuizSubmitRef = useRef<(() => void) | null>(null);
    const handleNextRef = useRef<(() => void) | null>(null);

    handleQuizSubmitRef.current = () => {
        const submissionId = `sub-${Date.now()}`;
        let autoGradeScore = 0;
        let essayCount = 0;

        questions.forEach(q => {
            if (q.type === QuestionType.Essay) {
                essayCount++;
            } else if (answers[q.id] === q.correctAnswer) {
                autoGradeScore += (q.totalMarks || 0);
            }
        });

        const newSubmission: Submission = {
            id: submissionId,
            quizId: quiz.id,
            studentId: student.id,
            answers,
            autoGradeScore,
            essayQuestionsCount: essayCount,
            isMarked: essayCount === 0 && !quiz.isExamMode,
            totalMarks: essayCount === 0 && !quiz.isExamMode ? autoGradeScore : undefined,
            submittedAt: Date.now(),
        };

        onComplete(newSubmission);
        setView('finished');
    };

    handleNextRef.current = () => {
        if (currentQuestionIndex === questions.length - 1) {
            handleQuizSubmitRef.current?.();
        } else if (currentQuestionIndex < questions.length - 1) {
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
        if (submittedAnswers[questionId]) return;
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };
    
    const handleSubmitAnswer = (questionId: string) => {
        const question = questions.find(q => q.id === questionId);
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

    if (view === 'finished') {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <CheckIcon className="w-12 h-12 text-blue-500" />
                </div>
                <h2 className="text-4xl font-black text-white mb-4">Task Submitted!</h2>
                <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                    Well done! Your work has been submitted to your teacher. 
                    {quiz.isExamMode ? " Results will be available once the teacher marks your submission." : " Check the 'My Grades' tab for your results."}
                </p>
                <button onClick={onCancel} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20">
                    Return to Dashboard
                </button>
            </div>
        );
    }
    
    const question = questions[currentQuestionIndex];
    const feedback = immediateFeedback[question.id];
    const isAnswered = answers[question.id] !== undefined && (question.type === QuestionType.Essay ? answers[question.id].trim() !== '' : answers[question.id] !== '');
    const isSubmittedForFeedback = !!submittedAnswers[question.id];

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {showEssayConfirm && (
                <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-slate-800 rounded-[2.5rem] p-8 max-w-md w-full border border-slate-700 shadow-2xl">
                        <h3 className="text-2xl font-black text-white mb-2">Submit Answer?</h3>
                        <p className="text-slate-400 mb-8">You won't be able to edit this answer once submitted.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowEssayConfirm(false)} className="flex-1 py-4 font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
                            <button onClick={() => handleConfirmEssaySubmit(question.id)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold transition-all">Submit</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-10">
                <button onClick={onCancel} className="text-slate-400 hover:text-white font-bold flex items-center transition-colors">
                    <LogOutIcon className="w-5 h-5 mr-2 rotate-180" /> Quit Task
                </button>
                <div className="flex items-center space-x-4">
                    {timeLeft !== null && (
                        <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-2xl flex items-center">
                            <ClockIcon className="w-4 h-4 mr-2 text-red-500" />
                            <span className="font-mono font-bold text-red-500">
                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    )}
                    <div className="bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-2xl text-slate-400 font-bold text-sm">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/40 border border-slate-700 rounded-[3rem] p-10 md:p-14 mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 leading-tight">{question.text}</h2>
                
                <div className="space-y-4">
                    {question.type === QuestionType.MultipleChoice && question.options?.map(option => (
                        <button key={option}
                            onClick={() => handleAnswerSelect(question.id, option)}
                            disabled={isSubmittedForFeedback}
                            className={`w-full text-left p-6 rounded-3xl border-2 transition-all font-bold text-lg ${
                                answers[question.id] === option 
                                ? 'bg-blue-600/20 border-blue-500 text-white' 
                                : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-500'
                            } ${isSubmittedForFeedback ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                            {option}
                        </button>
                    ))}
                    
                    {question.type === QuestionType.TrueFalse && ['True', 'False'].map(option => (
                        <button key={option}
                            onClick={() => handleAnswerSelect(question.id, option)}
                            disabled={isSubmittedForFeedback}
                            className={`w-full text-left p-6 rounded-3xl border-2 transition-all font-bold text-lg ${
                                answers[question.id] === option 
                                ? 'bg-blue-600/20 border-blue-500 text-white' 
                                : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-500'
                            } ${isSubmittedForFeedback ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                            {option}
                        </button>
                    ))}

                    {question.type === QuestionType.Essay && (
                        <textarea
                            value={answers[question.id] || ''}
                            onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
                            disabled={isSubmittedForFeedback}
                            rows={8}
                            className="w-full p-8 bg-slate-800/40 text-white rounded-[2rem] border-2 border-slate-700 focus:border-blue-500 outline-none transition-all font-medium text-lg placeholder:text-slate-600"
                            placeholder="Type your detailed answer here..."
                        />
                    )}
                </div>

                {feedback !== undefined && quiz.feedbackTiming === 'immediate' && (
                    <div className={`mt-10 p-8 rounded-[2rem] border-2 animate-in slide-in-from-top-4 duration-500 ${
                        feedback === true ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                        feedback === false ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}>
                        <div className="flex items-center mb-2">
                            {feedback === true ? <CheckIcon className="w-6 h-6 mr-2" /> : <XIcon className="w-6 h-6 mr-2" />}
                            <span className="font-black uppercase tracking-widest text-sm">
                                {feedback === true ? 'Correct' : feedback === false ? 'Incorrect' : 'Submitted'}
                            </span>
                        </div>
                        {question.explanation && <p className="text-slate-300 font-medium">{question.explanation}</p>}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center px-4">
                <div className="flex items-center">
                   {/* Optional: Add a visual progress indicator here */}
                </div>

                <div className="flex space-x-4">
                    {quiz.feedbackTiming === 'immediate' ? (
                        isSubmittedForFeedback ? (
                            <button 
                                onClick={isLastQuestion ? handleAttemptSubmit : () => setCurrentQuestionIndex(p => p + 1)}
                                className={`px-10 py-4 rounded-2xl font-black text-white transition-all transform active:scale-95 ${
                                    isLastQuestion ? 'bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/20'
                                }`}
                            >
                                {isLastQuestion ? 'Finish Task' : 'Next Question'}
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSubmitAnswer(question.id)}
                                disabled={!isAnswered}
                                className="px-10 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl font-black transition-all shadow-xl shadow-blue-600/20"
                            >
                                Submit Answer
                            </button>
                        )
                    ) : (
                        <div className="flex gap-4">
                            {!quiz.disablePrevious && (
                                <button 
                                    onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))}
                                    disabled={currentQuestionIndex === 0}
                                    className="px-8 py-4 bg-slate-800 text-slate-400 hover:text-white rounded-2xl font-bold disabled:opacity-30 transition-all"
                                >
                                    Previous
                                </button>
                            )}
                            <button 
                                onClick={isLastQuestion ? handleAttemptSubmit : () => setCurrentQuestionIndex(p => p + 1)}
                                className={`px-10 py-4 rounded-2xl font-black text-white transition-all transform active:scale-95 ${
                                    isLastQuestion ? 'bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/20'
                                }`}
                            >
                                {isLastQuestion ? 'Review & Submit' : 'Next Question'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isConfirmingSubmit && (
                <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-md flex items-center justify-center z-[110] p-4">
                    <div className="text-center max-w-md w-full animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <SendIcon className="w-10 h-10 text-blue-500" />
                        </div>
                        <h2 className="text-4xl font-black text-white mb-4">All Finished?</h2>
                        <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                            Once you submit, you won't be able to change any of your answers. Ready to send your work?
                        </p>
                        <div className="flex flex-col gap-3">
                            <button onClick={confirmSubmission} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[1.5rem] font-black text-xl transition-all shadow-2xl shadow-blue-600/40 active:scale-95">
                                Yes, Submit Task
                            </button>
                            <button onClick={cancelSubmission} className="w-full py-4 text-slate-500 hover:text-white font-bold transition-colors">
                                No, Let me Check Again
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- SUB-COMPONENTS FOR CONTENT TABS ---

const LessonsNotesTab: React.FC<{ notes: Note[]; lessons: Lesson[]; setLessons: (v: any) => void; student: Student; setJoiningLesson: (l: Lesson) => void; }> = ({ notes, lessons, student, setJoiningLesson }) => {
    const liveLessons = lessons.filter(l => l.type === LessonType.Live && !l.endTime);
    const otherContent = [...lessons.filter(l => l.type === LessonType.Prerecorded || l.endTime), ...notes];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold text-white">Lessons & Notes</h2>
            
            <section>
                <h3 className="text-lg font-semibold text-accent mb-4">Ongoing Live Lessons</h3>
                {liveLessons.length > 0 ? (
                    <div className="grid gap-4">
                        {liveLessons.map(l => (
                            <div key={l.id} className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl flex justify-between items-center group hover:border-blue-500 transition-all">
                                <div>
                                    <p className="font-bold text-white text-lg">{l.title}</p>
                                    <p className="text-sm text-blue-400 font-medium">Started: {l.scheduledTime ? new Date(l.scheduledTime).toLocaleTimeString() : 'Now'}</p>
                                </div>
                                <button onClick={() => setJoiningLesson(l)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-colors">Join Class</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-400 italic">No live lessons are active right now.</p>
                )}
            </section>

            <section>
                <h3 className="text-lg font-semibold text-accent mb-4">Notes & Prerecorded Lessons</h3>
                {otherContent.length > 0 ? (
                    <div className="grid gap-4">
                        {otherContent.map(item => (
                            <div key={item.id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl flex justify-between items-center hover:bg-slate-800 transition-colors">
                                <div>
                                    <p className="font-bold text-white">{item.title}</p>
                                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{(item as any).type}</p>
                                </div>
                                <button className="text-blue-400 hover:text-blue-300 font-semibold text-sm">View Content</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-400 italic">No shared notes or prerecorded lessons available yet.</p>
                )}
            </section>
        </div>
    );
};

const TasksTab: React.FC<{ quizzes: Quiz[]; student: Student; submissions: Submission[]; setTakingQuiz: (q: Quiz) => void; }> = ({ quizzes, student, submissions, setTakingQuiz }) => {
    const availableQuizzes = useMemo(() => {
        const now = Date.now();
        return quizzes.filter(q => {
            const isAvailable = q.status === 'active' || (q.status === 'scheduled' && q.scheduledFor && now >= q.scheduledFor);
            const userSubmissions = submissions.filter(s => s.quizId === q.id && s.studentId === student.id);
            const reachedLimit = q.allowMultipleSubmissions && q.maxSubmissions !== 0 && userSubmissions.length >= (q.maxSubmissions || 1);
            const isNotTaken = userSubmissions.length === 0 || (q.allowMultipleSubmissions && !reachedLimit);
            const isNotPastDue = !q.dueDate || now < q.dueDate;
            return isAvailable && isNotTaken && isNotPastDue;
        });
    }, [quizzes, submissions, student.id]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold text-white">Tasks</h2>
            <section>
                <h3 className="text-lg font-semibold text-accent mb-6">Available Tasks</h3>
                {availableQuizzes.length > 0 ? (
                    <div className="grid gap-4">
                        {availableQuizzes.map(quiz => (
                            <div key={quiz.id} className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl flex justify-between items-center group hover:border-blue-500 transition-all">
                                <div>
                                    <p className="font-bold text-white text-lg">{quiz.title}</p>
                                    <p className="text-sm text-slate-400">{quiz.questions.length} Questions • {quiz.category}</p>
                                </div>
                                <button onClick={() => setTakingQuiz(quiz)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-colors">Start Task</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-slate-600">
                            <CheckSquareIcon className="w-10 h-10" />
                        </div>
                        <p className="text-slate-400 text-lg">No new tasks available at the moment.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

const SubmittedTasksTab: React.FC<{ submissions: Submission[]; quizzes: Quiz[]; }> = ({ submissions, quizzes }) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold text-white">Submitted Tasks</h2>
            {submissions.length > 0 ? (
                <div className="grid gap-4">
                    {submissions.map(sub => {
                        const quiz = quizzes.find(q => q.id === sub.quizId);
                        return (
                            <div key={sub.id} className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white text-lg">{quiz?.title || 'Unknown Task'}</p>
                                    <p className="text-sm text-slate-400">Submitted on {new Date(sub.submittedAt).toLocaleDateString()}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${sub.isMarked ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {sub.isMarked ? 'Marked' : 'Pending Review'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-slate-600">
                        <ClipboardCheckIcon className="w-10 h-10" />
                    </div>
                    <p className="text-slate-400 text-lg">You haven't submitted any tasks yet.</p>
                </div>
            )}
        </div>
    );
};

const MyGradesTab: React.FC<{ submissions: Submission[]; quizzes: Quiz[]; }> = ({ submissions, quizzes }) => {
    const gradedSubmissions = submissions.filter(s => s.isMarked);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold text-white">My Grades</h2>
            {gradedSubmissions.length > 0 ? (
                <div className="grid gap-4">
                    {gradedSubmissions.map(sub => {
                        const quiz = quizzes.find(q => q.id === sub.quizId);
                        const totalPossible = quiz?.questions.reduce((acc, q) => acc + (q.totalMarks || 0), 0) || 0;
                        return (
                            <div key={sub.id} className="p-5 bg-slate-800/50 border border-slate-700 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-white text-lg">{quiz?.title}</p>
                                    <p className="text-sm text-slate-400">Graded on {new Date(sub.submittedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-blue-400">{sub.totalMarks} / {totalPossible}</p>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Score</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-slate-600">
                        <AwardIcon className="w-10 h-10" />
                    </div>
                    <p className="text-slate-400 text-lg">You don't have any graded submissions yet.</p>
                    <p className="text-slate-500 text-sm mt-2">Complete a quiz and wait for your teacher to mark it.</p>
                </div>
            )}
        </div>
    );
};

const MyProgressTab: React.FC<{ submissions: Submission[]; quizzes: Quiz[]; }> = ({ submissions, quizzes }) => {
    const marked = submissions.filter(s => s.isMarked);
    const avgScore = marked.length > 0 
        ? (marked.reduce((acc, s) => {
            const quiz = quizzes.find(q => q.id === s.quizId);
            const total = quiz?.questions.reduce((a, q) => a + (q.totalMarks || 0), 0) || 1;
            return acc + ((s.totalMarks || 0) / total);
        }, 0) / marked.length * 100).toFixed(0)
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold text-white">My Progress</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700 text-center">
                    <p className="text-slate-400 text-sm font-bold uppercase mb-2">Completion Rate</p>
                    <p className="text-4xl font-extrabold text-blue-500">{quizzes.length > 0 ? (submissions.length / quizzes.length * 100).toFixed(0) : 0}%</p>
                </div>
                <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700 text-center">
                    <p className="text-slate-400 text-sm font-bold uppercase mb-2">Average Score</p>
                    <p className="text-4xl font-extrabold text-emerald-500">{avgScore}%</p>
                    <p className="text-[10px] text-slate-500 mt-1">(on marked tasks)</p>
                </div>
                <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700 text-center">
                    <p className="text-slate-400 text-sm font-bold uppercase mb-2">Tasks Completed</p>
                    <p className="text-4xl font-extrabold text-accent">{submissions.length} / {quizzes.length}</p>
                </div>
            </div>

            <section className="bg-slate-800/30 rounded-2xl border border-slate-700 overflow-hidden">
                <h3 className="p-5 text-lg font-semibold text-white border-b border-slate-700">Task Breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-slate-400 text-xs font-bold uppercase border-b border-slate-700 bg-slate-800/50">
                                <th className="px-6 py-4">Task Title</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Score</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {submissions.length > 0 ? (
                                submissions.map(sub => {
                                    const quiz = quizzes.find(q => q.id === sub.quizId);
                                    return (
                                        <tr key={sub.id} className="border-b border-slate-700/50 hover:bg-slate-800/20">
                                            <td className="px-6 py-4 font-bold text-white">{quiz?.title}</td>
                                            <td className="px-6 py-4 text-slate-400">{quiz?.category}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${sub.isMarked ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                                    {sub.isMarked ? 'Marked' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-blue-400">{sub.isMarked ? sub.totalMarks : '-'}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">No tasks have been assigned yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

const EnquiryTab: React.FC<{ student: Student; enquiry?: Enquiry; setEnquiries: (val: Enquiry[] | ((prev: Enquiry[]) => Enquiry[])) => void; }> = ({ student, enquiry, setEnquiries }) => {
    const [text, setText] = useState('');
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [enquiry?.messages]);

    const handleSend = async () => {
        if (!text.trim() && !imageUrl && !audioUrl) return;
        setIsSending(true);

        try {
            const newMessage: EnquiryMessage = {
                id: `msg-${Date.now()}`,
                authorId: student.id,
                authorName: student.fullName,
                text: text.trim() || undefined,
                imageUrl: imageUrl || undefined,
                audioUrl: audioUrl || undefined,
                timestamp: Date.now(),
            };

            setEnquiries(prev => {
                const existing = prev.find(e => e.studentId === student.id);
                if (existing) {
                    return prev.map(e => e.studentId === student.id ? { ...e, messages: [...e.messages, newMessage], isResolved: false } : e);
                } else {
                    const newEnquiry: Enquiry = {
                        id: `enq-${Date.now()}`,
                        studentId: student.id,
                        classId: student.classId,
                        studentName: student.fullName,
                        messages: [newMessage],
                        isResolved: false,
                    };
                    return [...prev, newEnquiry];
                }
            });

            setText('');
            setImageUrl(null);
            setAudioUrl(null);
        } catch (e) {
            console.error("Failed to send enquiry:", e);
        } finally {
            setIsSending(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 2 * 1024 * 1024) {
              alert("Image too large. Please select an image under 2MB.");
              return;
            }
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
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: mimeType });
                const reader = new FileReader();
                reader.onloadend = () => setAudioUrl(reader.result as string);
                reader.readAsDataURL(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Mic access error:", err);
            alert("Could not access microphone. Please check your browser permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-white">Student Enquiry</h2>
                <p className="text-slate-400 mt-1">Have a question for your teacher? Ask here.</p>
            </div>
            
            <div className="flex-grow bg-slate-900/50 border border-slate-700 rounded-3xl overflow-hidden flex flex-col relative min-h-[400px]">
                <div ref={scrollRef} className="flex-grow p-6 overflow-y-auto space-y-4">
                    {enquiry && enquiry.messages.length > 0 ? (
                        enquiry.messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.authorId === student.id ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-2xl ${msg.authorId === student.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                                    <p className="text-[10px] font-bold uppercase opacity-60 mb-1">{msg.authorName}</p>
                                    {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                                    {msg.imageUrl && <img src={msg.imageUrl} alt="attachment" className="mt-2 rounded-lg max-w-full h-auto border border-white/10" />}
                                    {msg.audioUrl && <audio src={msg.audioUrl} controls className="mt-2 w-full h-8" />}
                                    <p className="text-[9px] mt-2 opacity-40 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center py-8">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600">
                                <HelpCircleIcon className="w-8 h-8" />
                            </div>
                            <p className="text-slate-500 max-w-xs">Your conversation will appear here once you send a message.</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-800/40 border-t border-slate-700">
                    {imageUrl && (
                        <div className="mb-4 relative inline-block">
                            <img src={imageUrl} alt="preview" className="w-20 h-20 object-cover rounded-xl border border-blue-500" />
                            <button onClick={() => setImageUrl(null)} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-lg"><XCircleIcon className="w-4 h-4"/></button>
                        </div>
                    )}
                    {audioUrl && (
                        <div className="mb-4 flex items-center space-x-2 bg-slate-800 p-2 rounded-xl border border-blue-500">
                            <audio src={audioUrl} controls className="h-8 flex-grow" />
                            <button onClick={() => setAudioUrl(null)} className="text-red-400 p-1 hover:bg-red-400/10 rounded-full"><Trash2Icon className="w-4 h-4"/></button>
                        </div>
                    )}
                    <div className="bg-slate-800 border border-slate-600 rounded-full flex items-center px-4 py-2 focus-within:border-blue-500 transition-colors shadow-inner">
                        <label className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer" title="Attach Image">
                            <PaperclipIcon className="w-5 h-5" />
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        <input 
                            type="text" 
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !isSending && handleSend()}
                            placeholder="Type your message..." 
                            disabled={isSending}
                            className="bg-transparent border-none outline-none flex-grow text-white px-3 placeholder:text-slate-500 text-sm"
                        />
                        <button 
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isSending}
                            className={`p-2 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-white'}`}
                        >
                            {isRecording ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                        </button>
                        <button 
                            onClick={handleSend}
                            disabled={isSending || (!text.trim() && !imageUrl && !audioUrl)}
                            className="ml-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white p-2.5 rounded-full transition-colors shadow-lg shadow-blue-600/20"
                        >
                            {isSending ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <SendIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudentRecordingsTab: React.FC<{ lessons: Lesson[]; student: Student; }> = ({ lessons, student }) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold text-white">Lesson Recordings</h2>
            
            <section>
                <h3 className="text-lg font-semibold text-accent mb-4">My Recordings</h3>
                <p className="text-slate-500 italic text-sm">You haven't recorded any lessons yet.</p>
            </section>

            <section>
                <h3 className="text-lg font-semibold text-accent mb-4">Shared by Teacher</h3>
                <p className="text-slate-500 italic text-sm">No recordings shared by your teacher yet.</p>
            </section>
        </div>
    );
};


// --- MAIN DASHBOARD COMPONENT ---

const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, onLogout }) => {
  const [activeTab, setActiveTab] = useState('lessons');
  
  const [teachers] = useLocalStorage<Teacher[]>('teachers', []);
  const [quizzes] = useLocalStorage<Quiz[]>(`quizzes-${student.classId}`, []);
  const [notes] = useLocalStorage<Note[]>(`notes-${student.classId}`, []);
  const [lessons, setLessons] = useLocalStorage<Lesson[]>(`lessons-${student.classId}`, []);
  const [enquiries, setEnquiries] = useLocalStorage<Enquiry[]>('enquiries', []);
  const [submissions, setSubmissions] = useLocalStorage<Submission[]>('submissions', []);
  const [notifications, setNotifications] = useLocalStorage<Notification[]>('notifications', []);

  const studentTeacher = useMemo(() => teachers.find(t => t.id === student.teacherId), [teachers, student.teacherId]);
  const studentSubmissions = useMemo(() => submissions.filter(s => s.studentId === student.id), [submissions, student.id]);
  const studentEnquiry = useMemo(() => enquiries.find(e => e.studentId === student.id), [enquiries, student.id]);

  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
  const [joiningLesson, setJoiningLesson] = useState<Lesson | null>(null);

  const tabs = [
    { id: 'lessons', label: 'Lessons & Notes', icon: BookOpenIcon },
    { id: 'tasks', label: 'Tasks', icon: CheckSquareIcon },
    { id: 'submitted-tasks', label: 'Submitted Tasks', icon: ClipboardCheckIcon },
    { id: 'grades', label: 'My Grades', icon: AwardIcon },
    { id: 'progress', label: 'My Progress', icon: BarChart2Icon },
    { id: 'enquiry', label: 'Enquiry', icon: HelpCircleIcon },
    { id: 'recordings', label: 'Recordings', icon: ArchiveIcon },
  ];
  
  const teacherTitle = studentTeacher?.gender === 'Male' ? 'Sir' : 'Madam';

  const handleQuizSubmission = (submission: Submission) => {
    setSubmissions(prev => [...prev, submission]);
    
    // Add notification for teacher
    const teacherNotif: Notification = {
        id: `notif-${Date.now()}`,
        userId: student.teacherId,
        message: `${student.fullName} has submitted the task: ${takingQuiz?.title}`,
        timestamp: Date.now(),
        isRead: false
    };
    setNotifications(prev => [...prev, teacherNotif]);
  };

  if (takingQuiz) {
    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-300 p-8">
            <QuizTaker 
                quiz={takingQuiz} 
                student={student} 
                onComplete={handleQuizSubmission} 
                onCancel={() => setTakingQuiz(null)} 
            />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 font-sans selection:bg-blue-500/30">
      <header className="p-6 md:px-12 md:py-8 max-w-[1600px] mx-auto flex justify-between items-start">
        <div className="animate-in slide-in-from-left duration-700">
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{student.fullName}</h1>
          <p className="text-slate-400 mt-2 font-medium">Teacher: <span className="text-blue-400 font-bold">{teacherTitle} {studentTeacher?.fullName}</span></p>
        </div>
        <div className="flex items-center space-x-6 animate-in slide-in-from-right duration-700">
            <InstallPWAButton />
            <NotificationBell user={student} />
            <button onClick={onLogout} className="flex items-center text-slate-400 hover:text-red-400 font-bold transition-colors">
                <LogOutIcon className="w-5 h-5 mr-2" /> Logout
            </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 md:px-12 pb-12">
        {/* Use md:flex-row to ensure sidebar and content are side-by-side on tablet/desktop sizes */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          
          {/* Sidebar Nav */}
          <aside className="w-full md:w-64 lg:w-80 flex-shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-700 md:sticky md:top-8">
            <nav className="bg-slate-800/40 border border-slate-700/50 p-3 lg:p-4 rounded-[2.5rem] space-y-2 backdrop-blur-sm shadow-xl">
              {tabs.map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`w-full flex items-center px-4 lg:px-6 py-3 lg:py-4 text-sm font-bold rounded-3xl transition-all duration-300 transform active:scale-95 ${
                    activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 ring-1 ring-blue-400/50' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <tab.icon className={`mr-3 lg:mr-4 w-5 h-5 lg:w-6 lg:h-6 transition-colors ${activeTab === tab.id ? 'text-white' : 'text-slate-500'}`} /> 
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main Content Area */}
          <section className="flex-grow w-full bg-slate-800/10 border border-slate-800/40 p-6 md:p-10 lg:p-14 rounded-[3rem] lg:rounded-[4rem] min-h-[750px] relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-1000 shadow-2xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent/5 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div className="relative z-10 h-full">
                {activeTab === 'lessons' && (
                    <LessonsNotesTab 
                        notes={notes} 
                        lessons={lessons} 
                        setLessons={setLessons} 
                        student={student} 
                        setJoiningLesson={setJoiningLesson} 
                    />
                )}
                
                {activeTab === 'tasks' && (
                    <TasksTab 
                        quizzes={quizzes} 
                        student={student} 
                        submissions={studentSubmissions} 
                        setTakingQuiz={setTakingQuiz} 
                    />
                )}
                
                {activeTab === 'submitted-tasks' && (
                    <SubmittedTasksTab 
                        submissions={studentSubmissions} 
                        quizzes={quizzes} 
                    />
                )}
                
                {activeTab === 'grades' && (
                    <MyGradesTab 
                        submissions={studentSubmissions} 
                        quizzes={quizzes} 
                    />
                )}
                
                {activeTab === 'progress' && (
                    <MyProgressTab 
                        submissions={studentSubmissions} 
                        quizzes={quizzes} 
                    />
                )}
                
                {activeTab === 'enquiry' && (
                    <EnquiryTab 
                        student={student} 
                        enquiry={studentEnquiry} 
                        setEnquiries={setEnquiries} 
                    />
                )}
                
                {activeTab === 'recordings' && (
                    <StudentRecordingsTab 
                        lessons={lessons} 
                        student={student} 
                    />
                )}
            </div>

          </section>
        </div>
      </main>
      
      {/* Footer Branding */}
      <footer className="max-w-[1600px] mx-auto px-12 py-8 text-center text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] opacity-50">
        NAWA Educational Platform • Ghana Educational Tech
      </footer>
    </div>
  );
};

export default StudentDashboard;
