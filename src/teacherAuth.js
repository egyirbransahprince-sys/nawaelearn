import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export async function teacherSignup(email, password, className) {
  const user = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, "teachers", email), {
    email,
    className
  });

  await setDoc(doc(db, "classes", className), {
    teacherEmail: email,
    className,
    isLive: false
  });
}

export async function teacherLogin(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}
