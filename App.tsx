
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { Teacher, Student, NawaClass, Gender } from './types';
import Auth from './components/Auth';
import { TeacherDashboard } from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import { PlusCircleIcon, EditIcon, Trash2Icon, UsersIcon, ChevronDownIcon, GitMergeIcon, ArrowDownToLineIcon, UploadCloudIcon, XIcon, XCircleIcon } from './components/icons';
import LandingPage from './components/LandingPage';
import NotificationBell from './components/NotificationBell';
import InstallPWAButton from './components/InstallPWAButton';

const App: React.FC = () => {
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setCurrentUser(null);
      setSelectedClassId(null);
      return;
    }

    const role = user.displayName?.startsWith("student:") ? "student" : "teacher";

    if (role === "teacher") {
      setCurrentUser({
        id: user.uid,
        role: "teacher",
        fullName: user.displayName?.replace("teacher:", "") || "Teacher",
        email: user.email || "",
      } as any);
    } else {
      setCurrentUser({
        id: user.uid,
        role: "student",
        fullName: user.displayName?.replace("student:", "") || "Student",
        classId: user.photoURL || "",
      } as any);
    }
  });

  return () => unsubscribe();
}, []);
  const [currentUser, setCurrentUser] = useState<Teacher | Student | null>(null);
const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const handleLogin = (user: Teacher | Student) => {
    setCurrentUser(user);
    if (user.role === 'student') {
        setSelectedClassId(user.classId);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedClassId(null);
    setShowAuth(false);
  };

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
  };
  
  const handleBackToClasses = () => {
    setSelectedClassId(null);
  }

  const handleBackToLanding = () => {
    setShowAuth(false);
  };

  if (!currentUser && !showAuth) {
    return <LandingPage onEnter={() => setShowAuth(true)} />;
  }

  if (!currentUser) {
    return <Auth onLogin={handleLogin} onBack={handleBackToLanding} />;
  }

  if (currentUser.role === 'teacher') {
    if (!selectedClassId) {
        return <ClassManagement teacher={currentUser} onSelectClass={handleSelectClass} onLogout={handleLogout} />
    }
    return <TeacherClassDashboard teacher={currentUser} selectedClassId={selectedClassId} onBackToClasses={handleBackToClasses} onLogout={handleLogout} />;
  }

  if (currentUser.role === 'student') {
    return <StudentDashboard student={currentUser} onLogout={handleLogout}/>;
  }

  return <div>Error: Unknown user role.</div>;
};

const TeacherClassDashboard: React.FC<{teacher: Teacher, selectedClassId: string, onBackToClasses: () => void, onLogout: () => void}> = ({teacher, selectedClassId, onBackToClasses, onLogout}) => {
    const [classes] = useLocalStorage<NawaClass[]>('classes', []);
    const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

    if (!selectedClass) {
        return <div className="p-8">Error: Class not found. <button onClick={onBackToClasses} className="text-primary underline">Go back</button></div>;
    }

    return <TeacherDashboard teacher={teacher} selectedClass={selectedClass} onBackToClasses={onBackToClasses} onLogout={onLogout} />
}

const ClassManagement: React.FC<{ teacher: Teacher, onSelectClass: (classId: string) => void, onLogout: () => void }> = ({ teacher, onSelectClass, onLogout }) => {
    const [classes, setClasses] = useLocalStorage<NawaClass[]>('classes', []);
    const [students, setStudents] = useLocalStorage<Student[]>('students', []);
    
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState<NawaClass | null>(null);
    const [className, setClassName] = useState('');
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    
    // Deletion Modal State
    const [classToDelete, setClassToDelete] = useState<NawaClass | null>(null);

    const teacherClasses = useMemo(() => classes.filter(c => c.teacherId === teacher.id), [classes, teacher.id]);

    const handleCreateOrUpdateClass = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingClass) {
            setClasses(classes.map(c => c.id === editingClass.id ? { ...c, name: className } : c));
        } else {
            const newClass: NawaClass = {
                id: `class-${Date.now()}`,
                name: className,
                teacherId: teacher.id
            };
            setClasses([...classes, newClass]);
        }
        closeModal();
    };

    const confirmDeleteClass = () => {
        if (!classToDelete) return;
        
        const { id: classId, name } = classToDelete;

        // Remove class
        setClasses(prev => prev.filter(c => c.id !== classId));
        // Remove students belonging to this class
        setStudents(prev => prev.filter(s => s.classId !== classId));
        
        // Clean up related local storage keys
        window.localStorage.removeItem(`quizzes-${classId}`);
        window.localStorage.removeItem(`notes-${classId}`);
        window.localStorage.removeItem(`lessons-${classId}`);
        
        setClassToDelete(null);
    }

    const handleRemoveStudent = (studentId: string) => {
        if (window.confirm("Are you sure you want to remove this student? This will delete their record permanently.")) {
            setStudents(prev => prev.filter(s => s.id !== studentId));
        }
    };

    const handleToggleStudents = (classId: string) => {
        setExpandedClassId(prevId => (prevId === classId ? null : classId));
    };

    const openCreateModal = () => {
        setEditingClass(null);
        setClassName('');
        setShowModal(true);
    };

    const openEditModal = (cls: NawaClass) => {
        setEditingClass(cls);
        setClassName(cls.name);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingClass(null);
        setClassName('');
    };
    
    const teacherTitle = teacher.gender === Gender.Male ? 'Sir' : 'Madam';

    return (
        <div className="min-h-screen bg-gray-900 text-gray-300">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-100">Class Management</h1>
                        <p className="text-gray-400">Welcome, {teacherTitle} {teacher.fullName}</p>
                    </div>
                     <div className="flex items-center space-x-4">
                        <InstallPWAButton isTeacher={true} />
                        <NotificationBell user={teacher} />
                        <button onClick={onLogout} className="text-sm text-accent hover:text-amber-400 hover:underline transition">Logout</button>
                     </div>
                </div>
                
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-100">Your Classes</h2>
                    <button onClick={openCreateModal} className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-800 shadow-sm transition">
                        <PlusCircleIcon className="w-5 h-5"/>
                        <span>Create New Class</span>
                    </button>
                </div>

                {teacherClasses.length > 0 ? (
                    <div className="space-y-4">
                        {teacherClasses.map(cls => {
                            const enrolledStudents = students.filter(s => s.classId === cls.id);
                            const isExpanded = expandedClassId === cls.id;

                            return (
                                <div key={cls.id} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700/50 hover:border-gray-600 transition-all">
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex-grow">
                                            <button onClick={() => onSelectClass(cls.id)} className="text-left w-full block group">
                                                <h3 className="text-lg font-bold text-accent group-hover:text-amber-400 transition-colors">{cls.name}</h3>
                                            </button>
                                            <div className="flex items-center text-sm text-gray-400 mt-1">
                                                <UsersIcon className="w-4 h-4 mr-2" />
                                                <span>{enrolledStudents.length} student(s) enrolled</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => openEditModal(cls)} className="p-1 text-gray-400 hover:text-blue-400" title="Edit Class Name">
                                                <EditIcon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => setClassToDelete(cls)} className="p-1 text-gray-400 hover:text-red-500" title="Delete Class">
                                                <Trash2Icon className="w-5 h-5"/>
                                            </button>
                                            <button onClick={() => handleToggleStudents(cls.id)} className={`p-1 text-gray-400 hover:text-blue-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} title="Show Students">
                                                <ChevronDownIcon className="w-6 h-6"/>
                                            </button>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="px-4 pb-4 border-t border-gray-700 bg-gray-900/20">
                                            <h4 className="text-md font-semibold mt-3 mb-2 text-gray-300">Enrolled Students</h4>
                                            {enrolledStudents.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {enrolledStudents.map(student => (
                                                        <li key={student.id} className="flex justify-between items-center text-sm bg-gray-700/50 p-2 rounded">
                                                            <span>{student.fullName}</span>
                                                            <button onClick={() => handleRemoveStudent(student.id)} className="text-red-500 hover:text-red-400" title="Remove Student"><Trash2Icon className="w-4 h-4" /></button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic">No students enrolled yet.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                     <div className="text-center p-12 bg-gray-800 rounded-2xl border border-dashed border-gray-700">
                        <p className="text-gray-500">You haven't created any classes yet.</p>
                        <button onClick={openCreateModal} className="mt-4 text-primary font-bold hover:underline">Create your first class</button>
                    </div>
                )}
                
                {/* Create/Edit Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl w-full max-w-md border border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white">{editingClass ? 'Edit Class Name' : 'Create New Class'}</h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-white"><XIcon className="w-6 h-6"/></button>
                            </div>
                            <form onSubmit={handleCreateOrUpdateClass}>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Class Name</label>
                                <input type="text" value={className} onChange={e => setClassName(e.target.value)} required className="w-full bg-gray-700 p-3 rounded-xl text-white border border-gray-600 focus:border-primary outline-none transition" placeholder="e.g. Grade 10 Mathematics" />
                                <div className="mt-6 flex justify-end space-x-3">
                                    <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-gray-300">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-800 font-bold transition">{editingClass ? 'Save Changes' : 'Create Class'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {classToDelete && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[100] p-4">
                        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl w-full max-w-lg border border-red-500/30">
                            <div className="flex flex-col items-center text-center">
                                <div className="bg-red-500/10 p-4 rounded-full mb-6">
                                    <Trash2Icon className="w-12 h-12 text-red-500"/>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Delete "{classToDelete.name}"?</h2>
                                <p className="text-gray-400 mb-8">
                                    This action is <span className="text-red-400 font-bold">permanent</span>. All students, lessons, notes, tasks, and recordings associated with this class will be deleted forever.
                                </p>
                                <div className="flex flex-col w-full space-y-3">
                                    <button 
                                        onClick={confirmDeleteClass}
                                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95"
                                    >
                                        Yes, Delete Everything
                                    </button>
                                    <button 
                                        onClick={() => setClassToDelete(null)}
                                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
