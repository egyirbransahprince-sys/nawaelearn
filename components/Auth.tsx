
import React, { useState } from 'react';
import { auth, db } from "../src/firebase";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword 
} from "firebase/auth";
import { 
  doc, getDoc, setDoc, query, where, collection, getDocs 
} from "firebase/firestore";
import { Teacher, Student, Gender, NawaClass } from '../types';

interface AuthProps {
  onLogin: (user: Teacher | Student) => void;
  onBack: () => void;
}

type AuthView = 'teacher-login' | 'teacher-signup' | 'student-join';

const Auth: React.FC<AuthProps> = ({ onLogin, onBack }) => {
  const [view, setView] = useState<AuthView>('teacher-login');
  
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.Male);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [className, setClassName] = useState('');
  const [error, setError] = useState('');

 const handleTeacherSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  try {
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    // Save teacher profile in Firestore
    await setDoc(doc(db, "teachers", uid), {
      id: uid,
      fullName,
      gender,
      email,
      role: "teacher",
      createdAt: new Date()
    });

    const teacher: Teacher = {
      id: uid,
      fullName,
      gender,
      email,
      role: "teacher"
    };

    onLogin(teacher);
  } catch (err: any) {
    setError(err.message);
  }
};


 const handleTeacherLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const snap = await getDoc(doc(db, "teachers", uid));
    if (!snap.exists()) {
      setError("Teacher profile not found.");
      return;
    }

    onLogin(snap.data() as Teacher);
  } catch (err: any) {
    setError("Invalid email or password");
  }
};

 const handleStudentJoin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  try {
    // Find class by name
    const q = query(collection(db, "classes"), where("name", "==", className));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      setError("Class not found.");
      return;
    }

    const classDoc = snapshot.docs[0];
    const classData = classDoc.data();

    // Ensure student name not in another class
    const studentQuery = query(collection(db, "students"), where("fullName", "==", fullName));
    const existing = await getDocs(studentQuery);

    if (!existing.empty && existing.docs[0].data().classId !== classDoc.id) {
      setError("This name is already registered in another class.");
      return;
    }

    const studentRef = doc(collection(db, "students"));
    const student: Student = {
      id: studentRef.id,
      fullName,
      classId: classDoc.id,
      teacherId: classData.teacherId,
      role: "student"
    };

    await setDoc(studentRef, student);
    onLogin(student);
  } catch (err: any) {
    setError("Failed to join class.");
  }
};


  const renderForm = () => {
    switch (view) {
      case 'teacher-signup':
        return (
          <form onSubmit={handleTeacherSignup} className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-textPrimary">Teacher Sign Up</h2>
            <div>
              <label className="block text-sm font-medium text-textSecondary">Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-black"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value as Gender)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-black">
                <option value={Gender.Male}>Male</option>
                <option value={Gender.Female}>Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-black"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-black"/>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-primary hover:bg-blue-800 transition">Sign Up</button>
            <p className="text-center text-sm">Already have an account? <button type="button" onClick={() => setView('teacher-login')} className="font-medium text-primary">Log In</button></p>
          </form>
        );
      case 'student-join':
        return (
          <form onSubmit={handleStudentJoin} className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-textPrimary">Join a Class</h2>
            <div>
              <label className="block text-sm font-medium text-textSecondary">Your Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-black"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary">Class Name</label>
              <input type="text" value={className} onChange={e => setClassName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-black" placeholder="e.g. Science 101"/>
            </div>
             {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-secondary hover:bg-emerald-600 transition">Join Class</button>
          </form>
        );
      case 'teacher-login':
      default:
        return (
          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-textPrimary">Teacher Login</h2>
            <div>
              <label className="block text-sm font-medium text-textSecondary">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-black"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-black"/>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="w-full py-2 px-4 rounded-md text-sm font-medium text-white bg-primary hover:bg-blue-800 transition">Log In</button>
            <p className="text-center text-sm">No account? <button type="button" onClick={() => setView('teacher-signup')} className="font-medium text-primary">Create one</button></p>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-primary">NAWA</h1>
            <p className="text-textSecondary font-medium">Smart and Easy Learning</p>
        </div>
        <div className="bg-surface p-8 rounded-xl shadow-lg border">
          <div className="mb-6 border-b border-gray-100">
            <nav className="-mb-px flex space-x-6">
              <button onClick={() => setView('teacher-login')} className={`${view.startsWith('teacher-') ? 'border-primary text-primary' : 'border-transparent text-gray-400'} whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-all`}>
                Teacher Portal
              </button>
              <button onClick={() => setView('student-join')} className={`${view === 'student-join' ? 'border-secondary text-secondary' : 'border-transparent text-gray-400'} whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm transition-all`}>
                Student Portal
              </button>
            </nav>
          </div>
          {renderForm()}
        </div>
        <div className="text-center mt-6">
          <button onClick={onBack} className="text-sm font-medium text-textSecondary hover:text-primary transition-colors">
            &larr; Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
