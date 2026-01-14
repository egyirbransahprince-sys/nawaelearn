import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function joinClass(name, className) {
  const classRef = doc(db, "classes", className);
  const cls = await getDoc(classRef);

  if (!cls.exists()) throw "Class does not exist";

  const id = className + "_" + name;

  await setDoc(doc(db, "students", id), {
    name,
    className
  });
}
