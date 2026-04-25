import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase.ts';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { TeacherDashboard } from './components/TeacherDashboard.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { LogIn, Rocket, BookOpen, UserCircle, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        } else {
          // If user exists in Auth but not in Firestore, we'll need to set role
          setRole(null);
        }
        setUser(u);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignIn = async (selectedRole: 'teacher' | 'student') => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      
      // Check if document exists, if not create it with role
      const userRef = doc(db, 'users', u.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          id: u.uid,
          name: u.displayName,
          email: u.email,
          role: selectedRole,
          createdAt: new Date().toISOString(),
        });
        setRole(selectedRole);
      } else {
        setRole(userDoc.data().role);
      }
      setUser(u);
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const handleSignOut = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Rocket className="w-12 h-12 text-blue-600" />
        </motion.div>
      </div>
    );
  }

  if (!user || !role) {
    return (
      <div className="min-h-screen bg-natural-bg flex flex-col items-center justify-center p-6 text-natural-text">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex p-4 rounded-3xl bg-natural-accent/10 mb-6 font-semibold items-center gap-2">
            <div className="w-8 h-8 bg-natural-accent rounded-xl flex items-center justify-center text-white font-bold">Φ</div>
            <span className="text-natural-accent font-display font-bold">PhysicsQuest AI</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-natural-heading">物理智引：让物理学习更智慧</h1>
          <p className="text-xl text-natural-muted max-w-2xl mx-auto">
            初高中物理多模态智能教培 Agent，集 OCR 识别、全题型智能批改与自动化管理于一体。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm cursor-pointer border border-natural-border flex flex-col items-center"
            onClick={() => handleSignIn('teacher')}
          >
            <div className="p-4 rounded-2xl bg-natural-bg mb-6">
              <BookOpen className="w-10 h-10 text-natural-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-natural-heading">我是老师</h3>
            <p className="text-natural-muted text-center">发布作业、智能批改、学情分析</p>
            <button className="mt-8 bg-natural-accent text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-natural-accent/20">
              <LogIn className="w-5 h-5" /> 立即登录
            </button>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm cursor-pointer border border-natural-border flex flex-col items-center"
            onClick={() => handleSignIn('student')}
          >
            <div className="p-4 rounded-2xl bg-natural-bg mb-6">
              <UserCircle className="w-10 h-10 text-natural-accent" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-natural-heading">我是学生</h3>
            <p className="text-natural-muted text-center">查看作业、拍照上传、智能纠错</p>
            <button className="mt-8 bg-natural-accent text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-natural-accent/20">
              <LogIn className="w-5 h-5" /> 立即登录
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text font-sans">
      <nav className="bg-white border-b border-natural-border px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-natural-accent rounded-xl flex items-center justify-center text-white font-bold text-xl">
            Φ
          </div>
          <span className="text-xl font-bold tracking-tight text-natural-heading">PhysicsQuest AI</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-natural-heading">{user.displayName}</p>
            <p className="text-xs text-natural-muted capitalize">{role === 'teacher' ? '教研组老师' : '物理尖子生'}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-full hover:bg-natural-bg text-natural-muted transition-colors border border-natural-border"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {role === 'teacher' ? (
            <TeacherDashboard key="teacher" user={user} />
          ) : (
            <StudentDashboard key="student" user={user} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
