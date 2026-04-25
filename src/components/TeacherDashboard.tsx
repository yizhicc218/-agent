import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { Plus, Users, BookOpen, Clock, Activity, Settings2, Trash2, ChevronRight, FileText, Camera, Upload, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { PhysicsAI } from '../services/gemini.ts';
import { format } from 'date-fns';

export function TeacherDashboard({ user }: { user: any }) {
  const [classes, setClasses] = useState<any[]>([]);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'classes' | 'homework' | 'ai'>('classes');
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showCreateHomework, setShowCreateHomework] = useState(false);
  
  // Create Class Form
  const [newClassName, setNewClassName] = useState('');
  const [newClassType, setNewClassType] = useState<'group' | 'one-on-one'>('group');

  // Create Homework Form
  const [hwTitle, setHwTitle] = useState('');
  const [hwDeadline, setHwDeadline] = useState('');
  const [hwQuestions, setHwQuestions] = useState<any[]>([]);
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
    fetchHomeworks();
  }, []);

  const fetchClasses = async () => {
    try {
      const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
      const snap = await getDocs(q);
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'classes');
    }
  };

  const fetchHomeworks = async () => {
    try {
      const q = query(collection(db, 'homeworks'), where('teacherId', '==', user.uid), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setHomeworks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'homeworks');
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName) return;
    try {
      await addDoc(collection(db, 'classes'), {
        name: newClassName,
        type: newClassType,
        teacherId: user.uid,
        createdAt: new Date().toISOString()
      });
      setNewClassName('');
      setShowCreateClass(false);
      fetchClasses();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'classes');
    }
  };

  const handleAddQuestionManually = () => {
    if (!uploadText && !imagePreview) return;
    const newQ = {
      id: Math.random().toString(36).substr(2, 9),
      content: uploadText || '查看图片题目',
      imageUrl: imagePreview || null,
      type: '解答题',
      correctAnswer: '见参考答案',
      knowledgePoints: ['物理综合']
    };
    setHwQuestions(prev => [...prev, newQ]);
    setUploadText('');
    setImagePreview(null);
  };

  const handleOcr = async () => {
    if (!imagePreview && !uploadText) return;
    setIsAiRunning(true);
    try {
      const questions = await PhysicsAI.extractQuestions(imagePreview || undefined, uploadText || undefined);
      const questionsWithIds = questions.map((q: any) => ({ ...q, id: Math.random().toString(36).substr(2, 9) }));
      setHwQuestions(prev => [...prev, ...questionsWithIds]);
      setUploadText('');
      setImagePreview(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiRunning(false);
    }
  };

  const handleCreateHomework = async (classId: string) => {
    if (!hwTitle || !hwDeadline || hwQuestions.length === 0) return;
    try {
      await addDoc(collection(db, 'homeworks'), {
        title: hwTitle,
        teacherId: user.uid,
        classId,
        deadline: new Date(hwDeadline).toISOString(),
        questions: hwQuestions,
        behaviorMonitor: true,
        revisionAllowed: true,
        aiManaged: true,
        createdAt: new Date().toISOString()
      });
      setShowCreateHomework(false);
      setHwTitle('');
      setHwQuestions([]);
      fetchHomeworks();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'homeworks');
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex gap-4 mb-10 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'classes', icon: Users, label: '班级与学员' },
          { id: 'homework', icon: BookOpen, label: '教学控制台' },
          { id: 'ai', icon: Activity, label: 'AI 托管中心' },
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

      {activeTab === 'classes' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-natural-heading">我的班级</h2>
            <button 
              onClick={() => setShowCreateClass(true)}
              className="flex items-center gap-2 bg-natural-accent text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity shadow-sm shadow-natural-accent/10"
            >
              <Plus className="w-5 h-5" /> 创建新班级
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {classes.map((c) => (
              <div key={c.id} className="bg-white p-8 rounded-[2rem] border border-natural-border hover:shadow-xl hover:shadow-natural-accent/5 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-2xl ${c.type === 'group' ? 'bg-natural-accent/10 text-natural-accent' : 'bg-orange-50 text-orange-600'}`}>
                    <Users className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-natural-border group-hover:text-natural-accent transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-1 text-natural-heading">{c.name}</h3>
                <p className="text-natural-muted text-sm">{c.type === 'group' ? '物理小班' : '一对一学员'}</p>
                <div className="mt-8 pt-6 border-t border-natural-border flex items-center justify-between">
                  <span className="text-xs font-bold text-natural-muted uppercase tracking-wider">0 位学生</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateHomework(true);
                    }}
                    className="text-natural-accent text-sm font-bold hover:underline"
                  >
                    发布作业
                  </button>
                </div>
              </div>
            ))}
            {classes.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-natural-border italic text-natural-muted">
                暂无班级，点击右上角开始创建
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'homework' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-natural-heading">发布的作业任务</h2>
            <button 
              onClick={() => setShowCreateHomework(true)}
              className="flex items-center gap-2 bg-natural-accent text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 shadow-sm shadow-natural-accent/10"
            >
              <FileText className="w-5 h-5" /> 发布新任务
            </button>
          </div>

          <div className="space-y-4">
            {homeworks.map(hw => (
              <div key={hw.id} className="bg-white p-6 rounded-3xl border border-natural-border flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-2xl bg-natural-sidebar text-natural-muted">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-natural-heading">{hw.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-natural-muted mt-1 uppercase tracking-wider font-semibold">
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 截止: {format(new Date(hw.deadline), 'MM-dd HH:mm')}</span>
                      <span className="flex items-center gap-1 text-natural-accent">
                        {hw.aiManaged ? <Sparkles className="w-4 h-4" /> : null} {hw.aiManaged ? "AI 托管中" : "手动批改"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-4 py-1.5 bg-natural-sidebar text-natural-accent text-xs font-bold rounded-full">已完成 0/0</span>
                  <button className="p-2 text-natural-muted hover:text-red-500 transition-colors border border-natural-border rounded-full">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {homeworks.length === 0 && (
              <div className="py-20 text-center bg-white rounded-[2rem] border border-natural-border flex flex-col items-center gap-4">
                <div className="p-4 bg-natural-sidebar rounded-full">
                  <BookOpen className="w-8 h-8 text-natural-muted" />
                </div>
                <p className="text-natural-muted italic">暂无发布的作业</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-natural-border shadow-sm">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-16 h-16 bg-natural-accent rounded-2xl flex items-center justify-center shadow-lg shadow-natural-accent/20">
              <Activity className="text-white w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-natural-heading">AI 托管系统</h2>
              <p className="text-natural-muted mt-1">无人化课后管理已开启，正在监控自动化作业周期。</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              {[
                { title: "全自动作业分发", desc: "到点自动推送到学生端，排除老师手动干扰", icon: CheckCircle },
                { title: "多模态全智能批改", desc: "精准识别物理符号、公式与手写解题流程", icon: CheckCircle },
                { title: "作业行为异常预警", desc: "基于作答时长与习惯自动识别抄袭疑似风险", icon: AlertCircle },
                { title: "动态学情画像同步", desc: "批改完成即刻重塑学员知识地图与薄弱项", icon: CheckCircle },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-5">
                  <div className="shrink-0 mt-1"> 
                    <item.icon className={`w-6 h-6 ${item.icon === AlertCircle ? 'text-orange-500' : 'text-natural-accent'}`} /> 
                  </div>
                  <div>
                    <h4 className="font-bold text-natural-heading uppercase tracking-wide">{item.title}</h4>
                    <p className="text-sm text-natural-muted leading-relaxed mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-natural-sidebar p-10 rounded-[2rem] flex flex-col items-center justify-center text-center border border-natural-border">
              <div className={`w-16 h-8 rounded-full p-1 cursor-pointer transition-colors ${isAiRunning ? 'bg-green-500' : 'bg-natural-accent/30'}`} onClick={() => setIsAiRunning(!isAiRunning)}>
                <motion.div 
                  className="w-6 h-6 bg-white rounded-full shadow-md"
                  animate={{ x: isAiRunning ? 32 : 0 }}
                />
              </div>
              <p className="mt-6 font-bold text-xl text-natural-heading">{isAiRunning ? '自动化管理运行中' : '托管模式已暂停'}</p>
              <p className="text-natural-muted text-sm mt-1 max-w-xs">开启托管后，AI 将代您处理 80% 以上的课后反馈工作。</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateClass && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-natural-heading/30 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-natural-border text-natural-text">
            <h2 className="text-2xl font-bold mb-8 text-natural-heading">创建新班级</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-natural-muted uppercase tracking-widest mb-3">班级名称</label>
                <input 
                  type="text" 
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="如：高三物理特训班"
                  className="w-full px-5 py-4 rounded-2xl bg-natural-sidebar border border-natural-border focus:ring-2 focus:ring-natural-accent outline-none transition-all placeholder:text-natural-muted/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setNewClassType('group')}
                  className={`py-4 rounded-2xl font-bold border-2 transition-all ${newClassType === 'group' ? 'border-natural-accent bg-natural-accent text-white' : 'border-natural-border text-natural-muted'}`}
                >
                  物理小班
                </button>
                <button 
                  onClick={() => setNewClassType('one-on-one')}
                  className={`py-4 rounded-2xl font-bold border-2 transition-all ${newClassType === 'one-on-one' ? 'border-natural-accent bg-natural-accent text-white' : 'border-natural-border text-natural-muted'}`}
                >
                  一对一
                </button>
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button 
                onClick={() => setShowCreateClass(false)}
                className="flex-1 py-4 rounded-2xl bg-natural-sidebar text-natural-muted font-bold"
              >
                取消
              </button>
              <button 
                onClick={handleCreateClass}
                className="flex-1 py-4 rounded-2xl bg-natural-accent text-white font-bold"
              >
                确认创建
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Homework Modal */}
      {showCreateHomework && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-natural-heading/30 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white w-full max-w-3xl rounded-[3rem] p-12 shadow-2xl my-auto border border-natural-border text-natural-text">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-3xl font-bold text-natural-heading">发布新任务</h2>
                <p className="text-natural-muted mt-1">您可以手动添加题目，或使用 AI 辅助识别录入。</p>
              </div>
              <button onClick={() => setShowCreateHomework(false)} className="p-3 hover:bg-natural-sidebar rounded-full text-natural-muted transition-colors">
                <Plus className="w-8 h-8 rotate-45" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-bold text-natural-muted uppercase tracking-widest mb-3">作业名称</label>
                  <input 
                    type="text" 
                    value={hwTitle}
                    onChange={(e) => setHwTitle(e.target.value)}
                    placeholder="如：牛顿第二定律综合测试"
                    className="w-full px-5 py-4 rounded-2xl bg-natural-sidebar border border-natural-border focus:ring-2 focus:ring-natural-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-natural-muted uppercase tracking-widest mb-3">截止时间</label>
                  <input 
                    type="datetime-local" 
                    value={hwDeadline}
                    onChange={(e) => setHwDeadline(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl bg-natural-sidebar border border-natural-border focus:ring-2 focus:ring-natural-accent outline-none"
                  />
                </div>
              </div>

              <div className="p-8 rounded-[2.5rem] bg-natural-light border-2 border-dashed border-natural-border">
                <h4 className="font-bold flex items-center gap-2 mb-6 text-natural-heading"><FileText className="w-5 h-5 text-natural-accent" /> 题目管理 (手动输入)</h4>
                <div className="space-y-6">
                  <textarea 
                    value={uploadText}
                    onChange={(e) => setUploadText(e.target.value)}
                    placeholder="输入题目文字描述..."
                    className="w-full h-32 px-5 py-4 rounded-2xl bg-white border border-natural-border focus:ring-2 focus:ring-natural-accent outline-none transition-all placeholder:text-natural-muted/50"
                  />
                  
                  <div className="flex flex-col md:flex-row gap-4 items-stretch">
                    <div className="flex-1 flex gap-4">
                      <label className="flex-1 cursor-pointer group">
                        <div className="h-full flex items-center justify-center gap-2 bg-white rounded-2xl border border-natural-border group-hover:bg-natural-sidebar transition-colors py-4">
                          <Upload className="w-5 h-5 text-natural-muted group-hover:text-natural-accent" />
                          <span className="text-sm font-bold text-natural-muted group-hover:text-natural-accent">插图</span>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                      </label>
                      <button 
                        onClick={handleAddQuestionManually}
                        disabled={!uploadText && !imagePreview}
                        className="flex-1 py-4 rounded-2xl bg-white border-2 border-natural-accent text-natural-accent font-bold hover:bg-natural-accent hover:text-white transition-all disabled:border-natural-border disabled:text-natural-muted disabled:hover:bg-white"
                      >
                        直接添加
                      </button>
                    </div>
                    
                    <button 
                      onClick={handleOcr}
                      disabled={isAiRunning || (!imagePreview && !uploadText)}
                      className="flex-1 py-4 rounded-2xl bg-natural-accent text-white font-bold flex items-center justify-center gap-3 hover:opacity-90 disabled:bg-natural-muted/30"
                    >
                      {isAiRunning ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Activity className="w-5 h-5" /></motion.div> : <Sparkles className="w-5 h-5" />}
                      <span>AI 识别并录入</span>
                    </button>
                  </div>

                  {imagePreview && (
                    <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-natural-accent/20">
                      <img src={imagePreview} className="w-full h-full object-cover" />
                      <button onClick={() => setImagePreview(null)} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm"><Plus className="w-3 h-3 rotate-45" /></button>
                    </div>
                  )}
                </div>
              </div>

              {hwQuestions.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-natural-muted uppercase tracking-widest">已添加题目 ({hwQuestions.length})</h4>
                  <div className="max-h-60 overflow-y-auto space-y-4 pr-3 custom-scrollbar">
                    {hwQuestions.map((q, idx) => (
                      <div key={q.id} className="bg-natural-sidebar p-5 rounded-2xl border border-natural-border">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-bold text-natural-accent bg-white border border-natural-accent/30 px-3 py-1 rounded-full">{idx + 1}. {q.type}</span>
                          <button onClick={() => setHwQuestions(prev => prev.filter(item => item.id !== q.id))}><Trash2 className="w-4 h-4 text-natural-muted hover:text-red-500" /></button>
                        </div>
                        <p className="text-sm text-natural-text leading-relaxed line-clamp-2">{q.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between items-center gap-8 p-10 bg-natural-sidebar rounded-[2.5rem] border border-natural-border">
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-6 h-6 rounded-md border-2 border-natural-accent flex items-center justify-center group-hover:bg-natural-accent/10 transition-colors">
                      <input type="checkbox" defaultChecked className="opacity-0 absolute w-6 h-6 cursor-pointer" />
                      <CheckCircle className="w-4 h-4 text-natural-accent" />
                    </div>
                    <span className="text-sm font-bold text-natural-heading">行为监督</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-6 h-6 rounded-md border-2 border-natural-accent flex items-center justify-center group-hover:bg-natural-accent/10 transition-colors">
                      <input type="checkbox" defaultChecked className="opacity-0 absolute w-6 h-6 cursor-pointer" />
                      <CheckCircle className="w-4 h-4 text-natural-accent" />
                    </div>
                    <span className="text-sm font-bold text-natural-heading">二次订正</span>
                  </label>
                </div>
                <button 
                  onClick={() => handleCreateHomework(classes[0]?.id)}
                  disabled={!hwTitle || hwQuestions.length === 0}
                  className="w-full md:w-auto bg-natural-accent text-white px-12 py-5 rounded-2xl font-bold font-display text-lg shadow-xl shadow-natural-accent/20 disabled:bg-natural-muted/30 disabled:shadow-none hover:opacity-90 transition-all"
                >
                  确认发布给学员
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
