import { auth } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";

export async function teacherSignup(fullName, email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, {
    displayName: "teacher:" + fullName
  });
  return userCredential.user;
}

export async function teacherLogin(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}
