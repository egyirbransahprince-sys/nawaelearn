import React, { useEffect, useState, useMemo } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

import { Teacher, Student, NawaClass, Gender } from "./types";
import Auth from "./components/Auth";
import LandingPage from "./components/LandingPage";
import { TeacherDashboard } from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Teacher | Student | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  // Firebase session restore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        setSelectedClassId(null);
        return;
      }

      // Try teacher first
      const teacherSnap = await getDoc(doc(db, "teachers", user.uid));
      if (teacherSnap.exists()) {
        const teacher = teacherSnap.data() as Teacher;
        setCurrentUser(teacher);
        return;
      }

      // Try student
      const studentSnap = await getDoc(doc(db, "students", user.uid));
      if (studentSnap.exists()) {
        const student = studentSnap.data() as Student;
        setCurrentUser(student);
        setSelectedClassId(student.classId);
        return;
      }

      setCurrentUser(null);
    });

    return () => unsub();
  }, []);

  const handleLogin = (user: Teacher | Student) => {
    setCurrentUser(user);
    if (user.role === "student") {
      setSelectedClassId(user.classId);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setCurrentUser(null);
    setSelectedClassId(null);
    setShowAuth(false);
  };

  if (!currentUser && !showAuth) {
    return <LandingPage onEnter={() => setShowAuth(true)} />;
  }

  if (!currentUser) {
    return <Auth onLogin={handleLogin} onBack={() => setShowAuth(false)} />;
  }

  if (currentUser.role === "student") {
    return <StudentDashboard student={currentUser} onLogout={handleLogout} />;
  }

  return <TeacherDashboard teacher={currentUser} onLogout={handleLogout} />;
};

export default App;
