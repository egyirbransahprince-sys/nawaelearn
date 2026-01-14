import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export function listenToQuizzes(className, callback) {
  const q = query(
    collection(db, "quizzes"),
    where("className", "==", className),
    where("published", "==", true)
  );

  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
