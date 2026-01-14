import { addDoc, collection } from "firebase/firestore";
import { db } from "./firebase";

export async function createQuiz(className, title, questions) {
  await addDoc(collection(db, "quizzes"), {
    className,
    title,
    questions,
    published: true,
    createdAt: new Date()
  });
}
