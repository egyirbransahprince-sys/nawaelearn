import { addDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export function addLesson(className, type, title, content) {
  return addDoc(collection(db,"lessons"),{
    className,
    type,
    title,
    content,
    published:true,
    createdAt:new Date()
  });
}

export function listenToLessons(className, cb){
  const q=query(collection(db,"lessons"),where("className","==",className));
  return onSnapshot(q,snap=>{
    cb(snap.docs.map(d=>d.data()));
  });
}
