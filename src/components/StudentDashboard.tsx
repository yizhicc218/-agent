import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { BookOpen, Clock, ChevronRight, CheckCircle2, History, TrendingUp, AlertCircle, Sparkles, Camera, Upload, Send, FileText, BarChart3, Info, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PhysicsAI } from '../services/gemini.ts';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

export function StudentDashboard({ user }: { user: any }) {
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'profile'>('current');
  
  const [selectedHw, setSelectedHw] = useState<any>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string>>({});
  const [submittedImages, setSubmittedImages] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradingResult, setGradingResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const memQ = query(collection(db, 'memberships'), where('userId', '==', user.uid));
      const memSnap = await getDocs(memQ);
      const classIds = memSnap.docs.map(d => d.data().classId);

      const hwSnap = await getDocs(collection(db, 'homeworks'));
      const activeHws = hwSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(hw => classIds.includes(hw.classId) || true); 
      setHomeworks(activeHws);

      const subQ = query(collection(db, 'submissions'), where('studentId', '==', user.uid));
      const subSnap = await getDocs(subQ);
      setSubmissions(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const profDoc = await getDoc(doc(db, 'student_profiles', user.uid));
      if (profDoc.exists()) {
        setProfile(profDoc.data());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageUpload = (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSubmittedImages(prev => ({ ...prev, [qId]: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedHw) return;
    setIsSubmitting(true);
    try {
      const answers: any[] = [];
      const stats = profile?.stats || { concept: 0, notation: 0, carelessness: 0 };
      const weakPoints = new Set(profile?.weakPoints || []);

      for (const q of selectedHw.questions) {
        const studentAns = submittedAnswers[q.id] || '';
        const studentImg = submittedImages[q.id];
        
        const result = await PhysicsAI.gradeSubmission(q.content, q.correctAnswer, studentAns, studentImg);
        
        answers.push({
          questionId: q.id,
          studentAnswer: studentAns,
          studentImage: studentImg || null,
          ...result
        });

        if (result.errorType && result.errorType !== 'none') {
          stats[result.errorType] = (stats[result.errorType] || 0) + 1;
          result.knowledgePoints.forEach((kp: string) => weakPoints.add(kp));
        }
      }

      const submissionData = {
        homeworkId: selectedHw.id,
        studentId: user.uid,
        status: 'graded',
        answers,
        submittedAt: new Date().toISOString(),
        gradedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'submissions'), submissionData);
      
      await setDoc(doc(db, 'student_profiles', user.uid), {
        studentId: user.uid,
        weakPoints: Array.from(weakPoints),
        stats,
        lastUpdated: new Date().toISOString()
      });

      setGradingResult(answers);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex gap-4">
        {[
          { id: 'current', icon: BookOpen, label: '待完成作业' },
          { id: 'history', icon: History, label: '历史回顾' },
          { id: 'profile', icon: TrendingUp, label: '学情画像' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all shrink-0 ${
              activeTab === tab.id 
              ? 'bg-natural-accent text-white shadow-lg shadow-natural-accent/20' 
              : 'bg-white text-natural-muted hover:bg-natural-sidebar border border-natural-border'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'current' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {homeworks.filter(hw => !submissions.find(s => s.homeworkId === hw.id)).map(hw => (
            <motion.div 
              whileHover={{ y: -5 }}
              key={hw.id} 
              className="bg-white p-8 rounded-[2.5rem] border border-natural-border shadow-sm cursor-pointer relative group transition-all"
              onClick={() => setSelectedHw(hw)}
            >
              <div className="flex justify-between items-start mb-8 text-natural-muted group-hover:text-natural-accent transition-colors">
                <div className="p-4 bg-natural-sidebar rounded-2xl">
                  <BookOpen className="w-8 h-8" />
                </div>
                <ChevronRight className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-natural-heading">{hw.title}</h3>
              <div className="flex items-center gap-6 text-xs text-natural-muted font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 截止: {format(new Date(hw.deadline), 'MM-dd HH:mm')}</span>
                <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {hw.questions?.length || 0} 题</span>
              </div>
              <button className="mt-10 w-full py-4 rounded-2xl bg-natural-accent text-white font-bold font-display flex items-center justify-center gap-2 shadow-lg shadow-natural-accent/10">
                开启挑战 <Sparkles className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
          {homeworks.filter(hw => !submissions.find(s => s.homeworkId === hw.id)).length === 0 && (
            <div className="col-span-full py-24 text-center bg-white rounded-[2.5rem] border border-natural-border flex flex-col items-center gap-4">
               <div className="w-16 h-16 bg-natural-sidebar rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-natural-accent" />
               </div>
               <p className="text-natural-muted font-display text-lg italic">所有任务已达成，休息一下吧！</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {submissions.map(sub => {
            const hw = homeworks.find(h => h.id === sub.homeworkId);
            return (
              <div key={sub.id} className="bg-white p-6 rounded-3xl border border-natural-border flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-2xl bg-natural-sidebar text-natural-accent">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-natural-heading">{hw?.title || '物理专题作业'}</h3>
                    <p className="text-xs text-natural-muted uppercase font-bold tracking-widest mt-1">
                      于 {format(new Date(sub.gradedAt), 'yyyy.MM.dd HH:mm')} 批改
                    </p>
                  </div>
                </div>
                <button className="text-natural-accent font-bold text-sm bg-natural-sidebar px-6 py-2.5 rounded-xl border border-natural-border hover:bg-natural-accent hover:text-white transition-all" onClick={() => { setSelectedHw(hw); setGradingResult(sub.answers); }}>
                  回顾详情
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'profile' && profile && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: '概念理解错误', count: profile.stats.concept, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: '答题规范疏漏', count: profile.stats.notation, color: 'text-natural-accent', bg: 'bg-natural-accent/10' },
              { label: '低级粗心失误', count: profile.stats.carelessness, color: 'text-red-600', bg: 'bg-red-50' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white p-10 rounded-[2.5rem] border border-natural-border text-center shadow-sm relative overflow-hidden">
                <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10`}>
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h4 className="text-xs font-bold text-natural-muted uppercase tracking-widest mb-2 relative z-10">{stat.label}</h4>
                <p className={`text-5xl font-black ${stat.color} relative z-10`}>{stat.count}</p>
                <div className={`absolute bottom-0 left-0 w-full h-1 ${stat.color.replace('text', 'bg')}`} />
              </div>
            ))}
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-natural-border shadow-sm grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <h3 className="text-xl font-bold mb-8 text-natural-heading flex items-center gap-3">
                 <div className="w-10 h-10 bg-natural-sidebar rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-natural-accent" /></div>
                 知识薄弱点库
              </h3>
              <div className="flex flex-wrap gap-4">
                {profile.weakPoints.map((kp: string, idx: number) => (
                  <span key={idx} className="px-6 py-2.5 bg-natural-sidebar text-natural-heading border border-natural-border font-bold rounded-2xl text-xs uppercase tracking-wide">
                    {kp}
                  </span>
                ))}
                {profile.weakPoints.length === 0 && <p className="text-natural-muted italic">暂无数据记录</p>}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="p-8 bg-natural-light border border-natural-border rounded-[2rem] flex-1">
                <h3 className="text-sm font-bold text-natural-accent uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> AI 诊断实时建议
                </h3>
                <p className="text-natural-muted leading-relaxed text-sm italic">
                   “检测到您在“<b>{profile.weakPoints[0] || '力学基础'}</b>”相关题目的模型选择上存在连续失误。建议回顾动能定理与动量定理的适用范畴对比，并尝试进行 3 道对应的迁移性训练。”
                </p>
                <div className="mt-8 pt-8 border-t border-natural-border flex gap-4">
                  <button className="flex-1 py-3 text-xs font-bold bg-natural-accent text-white rounded-xl shadow-lg shadow-natural-accent/20">推送针对性训练</button>
                  <button className="px-6 py-3 text-xs font-bold bg-white text-natural-muted border border-natural-border rounded-xl">导出画像</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Homework Modal */}
      {selectedHw && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-natural-heading/30 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-4xl rounded-[3rem] p-12 shadow-2xl my-auto border border-natural-border text-natural-text">
            <div className="flex justify-between items-center mb-12">
              <div>
                <h2 className="text-3xl font-extrabold text-natural-heading">{selectedHw.title}</h2>
                <p className="text-natural-muted mt-2 text-sm font-medium">请逐一完成题目，系统将根据您的思考路径提供多维度反馈。</p>
              </div>
              <button onClick={() => { setSelectedHw(null); setGradingResult(null); }} className="p-3 hover:bg-natural-sidebar rounded-full text-natural-muted transition-colors">
                <Plus className="w-8 h-8 rotate-45" />
              </button>
            </div>

            <div className="space-y-12 max-h-[65vh] overflow-y-auto pr-6 custom-scrollbar">
              {selectedHw.questions.map((q: any, idx: number) => {
                const result = gradingResult?.find((r: any) => r.questionId === q.id);
                return (
                  <div key={q.id} className={`p-10 rounded-[3rem] border transition-all ${result ? (result.isCorrect ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200') : 'bg-natural-sidebar border-natural-border'}`}>
                    <div className="flex justify-between items-center mb-8">
                      <span className="px-5 py-2 bg-white text-natural-muted rounded-full text-[10px] font-black uppercase tracking-widest border border-natural-border">问题 {idx + 1}</span>
                      {result && (
                        <div className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest ${result.isCorrect ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-red-600 text-white shadow-lg shadow-red-200'}`}>
                          {result.grade}
                        </div>
                      )}
                    </div>
                    <div className="text-xl leading-relaxed text-natural-heading mb-10 font-bold">
                      {q.content}
                    </div>

                    {!result ? (
                      <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 border border-natural-border shadow-sm">
                           <textarea 
                            value={submittedAnswers[q.id] || ''}
                            onChange={(e) => setSubmittedAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="在此输入解题过程与最终答案..."
                            className="w-full h-40 bg-transparent border-none focus:ring-0 resize-none text-natural-text text-lg placeholder:text-natural-muted/30"
                          />
                        </div>
                        <div className="flex items-center gap-6">
                          <label className="flex-1 cursor-pointer group">
                            <div className={`flex items-center justify-center gap-3 py-5 rounded-2xl font-bold border-2 border-dashed transition-all ${submittedImages[q.id] ? 'border-natural-accent bg-natural-accent/10 text-natural-accent' : 'border-natural-border text-natural-muted hover:border-natural-accent hover:bg-natural-sidebar'}`}>
                              <Camera className="w-6 h-6" /> {submittedImages[q.id] ? '手写草稿已上传' : '拍照上传草稿/图示'}
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(q.id, e)} />
                          </label>
                          {submittedImages[q.id] && (
                            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-md border-2 border-natural-accent/20">
                              <img src={submittedImages[q.id]} className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8 mt-10 pt-10 border-t border-natural-border/30">
                        <div className="bg-white p-8 rounded-[2rem] border border-natural-border shadow-sm">
                          <h4 className="flex items-center gap-3 text-natural-heading font-black text-sm uppercase tracking-widest mb-6 border-b border-natural-border pb-4">
                             <Sparkles className="w-5 h-5 text-natural-accent" /> 智引 AI 指导建议
                          </h4>
                          <div className="text-natural-muted leading-relaxed prose prose-natural max-w-none">
                             <ReactMarkdown>{result.feedback}</ReactMarkdown>
                          </div>
                          
                          {result.errorType !== 'none' && (
                             <div className="mt-8 flex flex-wrap gap-4">
                                <div className="px-4 py-1.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                                   归因: {result.errorType === 'concept' ? '概念理解错误' : result.errorType === 'notation' ? '答题规范疏漏' : '低级粗心失误'}
                                </div>
                                {result.knowledgePoints.map((kp: string, i: number) => (
                                   <div key={i} className="px-4 py-1.5 bg-natural-sidebar text-natural-muted rounded-full text-[10px] font-black uppercase tracking-widest border border-natural-border">
                                      知识点: {kp}
                                   </div>
                                ))}
                             </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!gradingResult && (
              <div className="mt-12 pt-10 border-t border-natural-border flex justify-end">
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full md:w-auto bg-natural-accent text-white px-16 py-6 rounded-3xl font-black font-display text-xl shadow-2xl shadow-natural-accent/30 hover:opacity-95 transition-all flex items-center justify-center gap-4 disabled:bg-natural-muted/30 disabled:shadow-none"
                >
                  {isSubmitting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Sparkles className="w-7 h-7" /></motion.div> : <Send className="w-7 h-7" />}
                  {isSubmitting ? 'AI 正在分析解题路径...' : '全卷提交并开启智能批改'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
