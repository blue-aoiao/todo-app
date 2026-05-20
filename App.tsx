import React, { useEffect, useState } from 'react';
import { Button, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface TodoItem {
  id: string;
  title: string;
  description: string;
  content: string;
  deadline: string;
  memo: string;
  repeatId?: string;
  completedAt?: string;
}

interface RepeatPattern {
  id: string;
  title: string;
  description: string;
  content: string;
  time: string;
  intervalDays: number;
  endDate: string;
}

interface HistorySnapshot {
  todos: TodoItem[];
  completedTodos: TodoItem[];
  repeatPatterns: RepeatPattern[];
}

export default function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [repeatPatterns, setRepeatPatterns] = useState<RepeatPattern[]>([]);
  const [completedTodos, setCompletedTodos] = useState<TodoItem[]>([]);
  
  // 履歴管理用スタック
  const [pastHistory, setPastHistory] = useState<HistorySnapshot[]>([]);
  const [futureHistory, setFutureHistory] = useState<HistorySnapshot[]>([]);

  // メイン画面の切り替え用（0: タスク一覧, 1: カレンダー）
  const [currentTab, setCurrentTab] = useState(0);

  // ★新しく追加：タスク追加モーダルの表示フラグ
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  // 入力フォーム用State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('12:00');
  const [memo, setMemo] = useState('');
  const [repeatInterval, setRepeatInterval] = useState('');
  const [repeatEndDate, setRepeatEndDate] = useState('');

  // 詳細モーダル用State
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // データの読み込みと保存
  useEffect(() => {
    const savedTodos = localStorage.getItem('advanced-todo-list-v7');
    const savedPatterns = localStorage.getItem('repeat-patterns-v7');
    const savedCompleted = localStorage.getItem('completed-todos-v7');
    if (savedTodos) setTodos(JSON.parse(savedTodos));
    if (savedPatterns) setRepeatPatterns(JSON.parse(savedPatterns));
    if (savedCompleted) setCompletedTodos(JSON.parse(savedCompleted));
  }, []);

  useEffect(() => {
    localStorage.setItem('advanced-todo-list-v7', JSON.stringify(todos));
    localStorage.setItem('repeat-patterns-v7', JSON.stringify(repeatPatterns));
    localStorage.setItem('completed-todos-v7', JSON.stringify(completedTodos));
  }, [todos, repeatPatterns, completedTodos]);

  const saveToHistory = () => {
    const snapshot: HistorySnapshot = {
      todos: JSON.parse(JSON.stringify(todos)),
      completedTodos: JSON.parse(JSON.stringify(completedTodos)),
      repeatPatterns: JSON.parse(JSON.stringify(repeatPatterns)),
    };
    setPastHistory([...pastHistory, snapshot]);
    setFutureHistory([]);
  };

  const handleUndo = () => {
    if (pastHistory.length === 0) return;
    const currentSnapshot: HistorySnapshot = {
      todos: JSON.parse(JSON.stringify(todos)),
      completedTodos: JSON.parse(JSON.stringify(completedTodos)),
      repeatPatterns: JSON.parse(JSON.stringify(repeatPatterns)),
    };
    setFutureHistory([currentSnapshot, ...futureHistory]);

    const previous = pastHistory[pastHistory.length - 1];
    const newPast = pastHistory.slice(0, pastHistory.length - 1);
    setTodos(previous.todos);
    setCompletedTodos(previous.completedTodos);
    setRepeatPatterns(previous.repeatPatterns);
    setPastHistory(newPast);
  };

  const handleRedo = () => {
    if (futureHistory.length === 0) return;
    const nextItem = futureHistory[0];
    const newFuture = futureHistory.slice(1);
    const currentSnapshot: HistorySnapshot = {
      todos: JSON.parse(JSON.stringify(todos)),
      completedTodos: JSON.parse(JSON.stringify(completedTodos)),
      repeatPatterns: JSON.parse(JSON.stringify(repeatPatterns)),
    };
    setPastHistory([...pastHistory, currentSnapshot]);
    setTodos(nextItem.todos);
    setCompletedTodos(nextItem.completedTodos);
    setRepeatPatterns(nextItem.repeatPatterns);
    setFutureHistory(newFuture);
  };

  const addTodo = () => {
    if (title.trim() === '' || deadlineDate === '') {
      alert('タイトルと締め切り日は必須入力です！');
      return;
    }

    saveToHistory();

    const intervalDays = parseInt(repeatInterval, 10);
    const fullDeadline = `${deadlineDate}T${deadlineTime}`;

    if (!isNaN(intervalDays) && intervalDays > 0) {
      if (!repeatEndDate) {
        alert('繰り返しを設定する場合は、終了日も指定してください！');
        return;
      }
      const newPatternId = `pattern-${Date.now()}`;
      const newPattern: RepeatPattern = { id: newPatternId, title, description, content, time: deadlineTime, intervalDays, endDate: repeatEndDate };
      setRepeatPatterns([...repeatPatterns, newPattern]);

      const firstTodo: TodoItem = { id: `todo-${Date.now()}`, title, description, content, deadline: fullDeadline, memo, repeatId: newPatternId };
      setTodos([...todos, firstTodo]);
    } else {
      const singleTodo: TodoItem = { id: `todo-${Date.now()}`, title, description, content, deadline: fullDeadline, memo };
      setTodos([...todos, singleTodo]);
    }

    // フォームをリセットしてモーダルを閉じる
    setTitle(''); setDescription(''); setContent(''); setMemo(''); setRepeatInterval(''); setRepeatEndDate('');
    setIsAddModalVisible(false);
  };

  const completeTodo = (targetTodo: TodoItem) => {
    saveToHistory();

    const todayStr = new Date().toISOString().split('T')[0];
    const completedItem: TodoItem = { ...targetTodo, completedAt: todayStr };

    let updatedCompleted = [completedItem, ...completedTodos];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    updatedCompleted = updatedCompleted.filter((todo) => {
      if (!todo.completedAt) return false;
      return new Date(todo.completedAt) >= thirtyDaysAgo;
    });

    if (updatedCompleted.length > 100) {
      updatedCompleted = updatedCompleted.slice(0, 100);
    }
    setCompletedTodos(updatedCompleted);

    const filteredTodos = todos.filter((todo) => todo.id !== targetTodo.id);

    if (targetTodo.repeatId) {
      const pattern = repeatPatterns.find((p) => p.id === targetTodo.repeatId);
      if (pattern) {
        const currentDeadline = new Date(targetTodo.deadline);
        currentDeadline.setDate(currentDeadline.getDate() + pattern.intervalDays);
        const endDate = new Date(pattern.endDate);

        if (currentDeadline <= endDate) {
          const y = currentDeadline.getFullYear();
          const m = String(currentDeadline.getMonth() + 1).padStart(2, '0');
          const d = String(currentDeadline.getDate()).padStart(2, '0');
          const nextTodo: TodoItem = {
            id: `todo-${Date.now()}`,
            title: pattern.title,
            description: pattern.description,
            content: pattern.content,
            deadline: `${y}-${m}-${d}T${pattern.time}`,
            memo: '',
            repeatId: pattern.id,
          };
          setTodos([...filteredTodos, nextTodo]);
          return;
        } else {
          setRepeatPatterns(repeatPatterns.filter((p) => p.id !== pattern.id));
        }
      }
    }
    setTodos(filteredTodos);
  };

  const openDetailModal = (todo: TodoItem) => {
    setSelectedTodo(todo);
    setIsDetailModalVisible(true);
  };

  const sortedTodos = [...todos].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const formatDeadline = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // Web・アプリ兼用の簡易スワイプハンドラ（擬似的に左右クリックやドラッグに対応させる土台）
  let touchStartX = 0;
  const handleTouchStart = (e: any) => { touchStartX = e.nativeEvent.pageX; };
  const handleTouchEnd = (e: any) => {
    const touchEndX = e.nativeEvent.pageX;
    const dx = touchStartX - touchEndX;
    if (dx > 60 && currentTab === 0) setCurrentTab(1); // 左スワイプ -> 画面2
    if (dx < -60 && currentTab === 1) setCurrentTab(0); // 右スワイプ -> 画面1
  };

  return (
    <View style={styles.container}>
      
      {/*  1. ヘッダーエリア */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => alert('ヘルプは後ほど実装します！')}>
          <Text style={styles.headerIconText}>？</Text>
        </TouchableOpacity>
        
        {/*  開いた日の日付を自動で取得して「XXXX年XX月XX日 (曜日)」に変換 */}
        <Text style={styles.headerDate}>
          {(() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const date = String(today.getDate()).padStart(2, '0');
            const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()];
            return `${year}年${month}月${date}日 (${dayOfWeek})`;
          })()}
        </Text>
        
        <TouchableOpacity style={styles.headerIcon} onPress={() => alert('ソート機能は後ほど実装します！')}>
          <Text style={styles.headerIconText}>▽</Text>
        </TouchableOpacity>
      </View>

      {/* スワイプを視覚的に助けるインジケーター兼タブ */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, currentTab === 0 && styles.tabActive]} onPress={() => setCurrentTab(0)}>
          <Text style={[styles.tabText, currentTab === 0 && styles.tabTextActive]}> タスク一覧</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, currentTab === 1 && styles.tabActive]} onPress={() => setCurrentTab(1)}>
          <Text style={[styles.tabText, currentTab === 1 && styles.tabTextActive]}> カレンダー</Text>
        </TouchableOpacity>
      </View>

      {/*  2. メインエリア（左右スワイプ切り替えの検出） */}
      <View 
        style={styles.mainContent} 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
      >
        {currentTab === 0 ? (
          /* ーー 画面1: タスク一覧 ーー */
          <View style={{ flex: 1 }}>
            <FlatList
              data={sortedTodos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.todoItem}>
                  <TouchableOpacity style={styles.checkbox} onPress={() => completeTodo(item)}>
                    <View style={styles.checkboxInner} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.textContainer} onPress={() => openDetailModal(item)}>
                    <Text style={styles.todoTitle}>{item.title} {item.repeatId ? <Text style={styles.repeatBadge}>🔄 定期</Text> : null}</Text>
                    {item.description ? <Text style={styles.todoDescription}>{item.description}</Text> : null}
                    <Text style={styles.deadlineText}> 締め切り: {formatDeadline(item.deadline)}</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>有効なタスクはありません。{"\n"}フッターの「＋」から追加しましょう！</Text>}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          /* ーー 画面2: カレンダー表示（次のステップで本格実装） ーー */
          <View style={styles.calendarPlaceholder}>
            <Text style={styles.calendarTitle}> カレンダービュー (開発中)</Text>
            <Text style={styles.calendarSub}>ここに各日付と締め切りタスクの簡略情報が並びます！</Text>
          </View>
        )}
      </View>

      {/*  3. フッターエリア */}
      <View style={styles.footer}>
        {/* 左側：Undo / Redo */}
        <View style={styles.footerLeft}>
          <TouchableOpacity style={[styles.histBtn, pastHistory.length === 0 && styles.histBtnDisabled]} onPress={handleUndo} disabled={pastHistory.length === 0}>
            <Text style={styles.histBtnText}>↩ ({pastHistory.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.histBtn, { marginLeft: 5 }, futureHistory.length === 0 && styles.histBtnDisabled]} onPress={handleRedo} disabled={futureHistory.length === 0}>
            <Text style={styles.histBtnText}>↪ ({futureHistory.length})</Text>
          </TouchableOpacity>
        </View>

        {/* 中央：タスク追加（＋ボタン） */}
        <View style={styles.footerCenter}>
          <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalVisible(true)}>
            <Text style={styles.addButtonText}>＋ 追加</Text>
          </TouchableOpacity>
        </View>

        {/* 右側：タスク管理メニュー */}
        <View style={styles.footerRight}>
          <TouchableOpacity style={styles.menuButton} onPress={() => alert('管理メニュー（完了タスクや定期一覧）は後ほど実装します！')}>
            <Text style={styles.menuButtonText}> メニュー</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ーーー 新しく追加：タスク追加フォームのポップアップ（モーダル） ーーー */}
      <Modal animationType="slide" transparent={true} visible={isAddModalVisible} onRequestClose={() => setIsAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}> 新しいタスクを追加</Text>
            <ScrollView style={{ marginBottom: 15 }}>
              <TextInput style={styles.input} placeholder="タイトル（必須）" value={title} onChangeText={setTitle} />
              <TextInput style={styles.input} placeholder="概要" value={description} onChangeText={setDescription} />
              <TextInput style={styles.input} placeholder="内容" value={content} onChangeText={setContent} />
              <TextInput style={styles.input} placeholder="その他メモ" value={memo} onChangeText={setMemo} />
              
              <Text style={styles.modalLabel}> 締め切り日時</Text>
              <View style={styles.dateTimeRow}>
                <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} style={{ ...webInputStyle, flex: 1, marginRight: 5 }} />
                <input type="time" step="300" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)} style={{ ...webInputStyle, width: '100px' }} />
              </View>

              <View style={styles.repeatSection}>
                <Text style={styles.sectionLabel}> 定期タスク設定 (任意)</Text>
                <View style={styles.dateTimeRow}>
                  <TextInput style={[styles.input, { flex: 1, marginRight: 5, marginBottom: 0 }]} placeholder="例: 3" keyboardType="numeric" value={repeatInterval} onChangeText={setRepeatInterval} />
                  <Text style={{ alignSelf: 'center', marginRight: 10, fontSize: 13 }}>日置き</Text>
                  <input type="date" value={repeatEndDate} onChange={(e) => setRepeatEndDate(e.target.value)} style={{ ...webInputStyle, flex: 1, marginBottom: 0 }} />
                  <Text style={{ alignSelf: 'center', marginLeft: 5, fontSize: 13 }}>まで</Text>
                </View>
              </View>
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Button title="キャンセル" color="#666" onPress={() => setIsAddModalVisible(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="追加する" color="#FF9500" onPress={addTodo} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ーーー 詳細確認用モーダル ーーー */}
      <Modal animationType="fade" transparent={true} visible={isDetailModalVisible} onRequestClose={() => setIsDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedTodo && (
              <ScrollView>
                <Text style={styles.modalTitle}> タスク詳細</Text>
                <Text style={styles.modalLabel}>【タイトル】</Text><Text style={styles.modalValue}>{selectedTodo.title}</Text>
                <Text style={styles.modalLabel}>【概要】</Text><Text style={styles.modalValue}>{selectedTodo.description || '（なし）'}</Text>
                <Text style={styles.modalLabel}>【内容】</Text><Text style={styles.modalValue}>{selectedTodo.content || '（なし）'}</Text>
                <Text style={styles.modalLabel}>【締め切り日時】</Text><Text style={styles.modalValue}>{formatDeadline(selectedTodo.deadline)}</Text>
                <Text style={styles.modalLabel}>【その他メモ】</Text><Text style={styles.modalValue}>{selectedTodo.memo || '（なし）'}</Text>
                {selectedTodo.completedAt && (<><Text style={styles.modalLabel}>【完了日】</Text><Text style={styles.modalValue}>{selectedTodo.completedAt}</Text></>)}
              </ScrollView>
            )}
            <View style={{ marginTop: 15 }}><Button title="閉じる" color="#666" onPress={() => setIsDetailModalVisible(false)} /></View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const webInputStyle = {
  height: '38px', padding: '0 10px', borderColor: '#ddd', borderWidth: '1px', borderRadius: '5px', marginBottom: '10px', fontSize: '14px', fontFamily: 'sans-serif', backgroundColor: '#fff',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  
  //  ヘッダーのスタイル
  header: { height: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' },
  headerIconText: { fontSize: 14 },
  headerDate: { fontSize: 16, fontWeight: 'bold', color: '#333' },

  // タブバー（スワイプの補助）
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#FF9500' },
  tabText: { fontSize: 13, color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#FF9500' },

  //  メインエリアのスタイル
  mainContent: { flex: 1, padding: 15 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 13, lineHeight: 20 },

  // タスクアイテム
  todoItem: { backgroundColor: '#fff', padding: 12, borderRadius: 5, marginBottom: 8, borderLeftWidth: 5, borderLeftColor: '#FF9500', flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#FF9500', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent' },
  textContainer: { flex: 1, cursor: 'pointer' },
  todoTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  repeatBadge: { fontSize: 10, color: '#007AFF', fontWeight: 'normal' },
  todoDescription: { fontSize: 12, color: '#666', marginTop: 2 },
  deadlineText: { fontSize: 11, color: '#FF3B30', fontWeight: '600', marginTop: 3 },

  // カレンダープレースホルダー
  calendarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  calendarTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  calendarSub: { fontSize: 13, color: '#888', textAlign: 'center' },
  
  //  フッターのスタイル
  footer: { height: 65, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 5 },
  footerLeft: { flex: 1.2, flexDirection: 'row', justifyContent: 'flex-start' },
  footerCenter: { flex: 1, alignItems: 'center' },
  footerRight: { flex: 1.2, flexDirection: 'row', justifyContent: 'flex-end' },

  // フッター内の各種ボタン
  histBtn: { backgroundColor: '#f0f0f0', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, minWidth: 45, alignItems: 'center' },
  histBtnDisabled: { opacity: 0.4 },
  histBtnText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  addButton: { backgroundColor: '#FF9500', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  menuButton: { backgroundColor: '#f0f0f0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  menuButtonText: { fontSize: 12, fontWeight: 'bold', color: '#555' },

  // モーダル共通スタイル
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  modalLabel: { fontSize: 12, fontWeight: 'bold', color: '#666', marginTop: 10 },
  modalValue: { fontSize: 14, color: '#333', backgroundColor: '#f9f9f9', padding: 8, borderRadius: 5, marginTop: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 5, paddingHorizontal: 10, height: 36, marginBottom: 8, fontSize: 13 },
  dateTimeRow: { flexDirection: 'row', marginBottom: 5 },
  repeatSection: { backgroundColor: '#f9f9f9', padding: 8, borderRadius: 5, marginBottom: 5, borderWidth: 1, borderColor: '#e8e8e8' },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#555', marginBottom: 5 },
});